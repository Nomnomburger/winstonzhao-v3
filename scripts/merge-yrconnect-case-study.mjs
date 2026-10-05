#!/usr/bin/env node
// Preview: node scripts/merge-yrconnect-case-study.mjs
// Publish: node scripts/merge-yrconnect-case-study.mjs --apply
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@sanity/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'content/figma-case-studies');
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(folder, name), `${JSON.stringify(value, null, 2)}\n`);
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/merge-yrconnect-case-study.mjs [--apply]');
const apply = args.includes('--apply');
const yrId = 'legacy-portfolio-yrconnect';
const duplicateId = 'figma-portfolio-munisync';
const heatmapId = 'legacy-portfolio-heatmap';
const coverIds = ['legacy-portfolio-elapsedesign', 'legacy-portfolio-hopperhangout'];
const ids = [yrId, duplicateId, heatmapId, ...coverIds];
const token = process.env.SANITY_API_TOKEN || JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
if (!token) throw new Error('Sanity authentication is required.');
const client = createClient({projectId: '7k8ajlip', dataset: 'production', apiVersion: '2025-01-01', useCdn: false, perspective: 'raw', token});
const before = await client.fetch('*[_id in $ids]', {ids});
const lookup = id => {
  const doc = before.find(doc => doc._id === id);
  if (!doc) throw new Error(`Missing original published project: ${id}`);
  return doc;
};
const yr = lookup(yrId);
const duplicate = lookup(duplicateId);
const heatmap = lookup(heatmapId);
const copy = read('yrconnect-expanded-copy.json');
const fields = copy.fields ?? copy.document;
const allowed = ['description', 'intro', 'summary', 'overview', 'impact', 'details', 'sections', 'showSideMenu'];
const protectedFields = ['title', 'slug', 'year', 'order', 'featured', 'coverImage', 'hero', 'client', 'discipline', 'link'];
if (copy.documentId !== yrId || yr.title !== 'YRConnect' || yr.featured !== true || heatmap.featured !== true) throw new Error('Unexpected project identity or featured status.');
if (fields.showSideMenu !== true || fields.sections?.length < 4) throw new Error('Complete chapters and side navigation are required.');
if (!fields.description?.trim() || fields.description.length > 160) throw new Error('Invalid case study description.');
for (const key of protectedFields) {
  if (key in fields && !isDeepStrictEqual(fields[key], yr[key])) throw new Error(`Unexpected case study change to ${key}.`);
}
if (fields.sections.some(section => !section.title?.trim() || !section.heading?.trim() || !section.content?.some(block => block._type === 'block'))) throw new Error('Each chapter requires a navigation label, heading, and text.');
const references = sections => sections.flatMap(section => section.content ?? []).filter(block => block._type === 'mediaImage').map(block => block.asset?._ref).sort();
const expectedImages = [...references(yr.sections), ...references(duplicate.sections)].sort();
if (!isDeepStrictEqual(references(fields.sections), expectedImages)) throw new Error('Retain the combined body images exactly once.');
function validateKeys(value, location = 'fields') {
  if (Array.isArray(value)) {
    const keys = new Set();
    for (const item of value) {
      if (item && typeof item === 'object') {
        if (!item._key || keys.has(item._key)) throw new Error(`${location}: missing or duplicate array key.`);
        keys.add(item._key);
      }
      validateKeys(item, location);
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) validateKeys(item, `${location}.${key}`);
  }
}
const yrSet = {...Object.fromEntries(allowed.filter(key => key in fields).map(key => [key, fields[key]])), order: 1};
validateKeys(yrSet);
const coverPlan = read('cover-restoration-plan.json');
if (!isDeepStrictEqual(coverPlan.projects.map(project => project.id).sort(), [...coverIds].sort())) throw new Error('Cover plan must contain exactly Elapse and Hopper Hangout.');
const replacements = coverPlan.projects.map(project => {
  const doc = lookup(project.id);
  if (!project.coverImage?.asset?._ref || project.title !== doc.title) throw new Error(`Invalid restored cover for ${doc.title}.`);
  return {doc, set: {coverImage: project.coverImage}, sourceFile: project.sourceFile};
});
const updates = [{doc: yr, set: yrSet}, {doc: heatmap, set: {order: 2}}, ...replacements];
const recoverableId = `drafts.${duplicateId}`;
const assetIds = [...new Set([...expectedImages, ...replacements.map(item => item.set.coverImage.asset._ref)])];
const assets = await client.fetch('*[_type == "sanity.imageAsset" && _id in $ids]._id', {ids: assetIds});
if (assets.length !== assetIds.length) throw new Error('A required project image is missing from Sanity.');
console.table(updates.map(({doc, set}) => ({project: doc.title, changes: Object.keys(set).join(', ')})));
console.log(`Merge ${duplicate.title} into ${yr.title}; retain its original as ${recoverableId}.`);
if (!apply) {
  console.log('Dry run validated the merged case study, first placement, and original mockup covers. No content changed.');
  process.exit(0);
}
save('sanity-before-yrconnect-final-update.json', {savedAt: new Date().toISOString(), projectId: '7k8ajlip', dataset: 'production', documents: before});
const {_rev, _updatedAt, _createdAt, ...recoverable} = duplicate;
let transaction = client.transaction().createIfNotExists({...recoverable, _id: recoverableId});
for (const {doc, set} of updates) transaction = transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set(set));
// Guard the duplicate against concurrent edits before removing its public version.
transaction = transaction.patch(duplicateId, patch => patch.ifRevisionId(duplicate._rev).set({title: duplicate.title})).delete(duplicateId);
const result = await transaction.commit({visibility: 'sync', returnDocuments: false});
const after = await client.fetch('*[_id in $ids]', {ids: [...ids, recoverableId]});
const strip = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt'].includes(key)));
for (const {doc, set} of updates) {
  const actual = after.find(item => item._id === doc._id);
  if (!actual || !isDeepStrictEqual(strip(actual), strip({...doc, ...set}))) throw new Error(`Published verification failed for ${doc.title}.`);
}
if (after.some(doc => doc._id === duplicateId) || !after.some(doc => doc._id === recoverableId)) throw new Error('The duplicate was not safely unpublished.');
const recovered = after.find(doc => doc._id === recoverableId);
const recoveryContent = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt', '_createdAt'].includes(key)));
if (!isDeepStrictEqual(recoveryContent(recovered), {...recoverable, _id: recoverableId})) throw new Error('The recovery draft differs from the original duplicate.');
save('yrconnect-merge-result.json', {
  publishedAt: new Date().toISOString(), transactionId: result.transactionId,
  id: yrId, slug: yr.slug.current, title: yr.title, order: 1,
  sectionTitles: yrSet.sections.map(section => section.title), sideNavigation: true,
  retainedBodyImages: expectedImages, sourceNotes: copy.sourceNotes ?? copy.provenance,
  removedDuplicate: {id: duplicateId, recoverableId},
  restoredCovers: replacements.map(({doc, set, sourceFile}) => ({id: doc._id, title: doc.title, asset: set.coverImage.asset._ref, sourceFile})),
  allUnrelatedFieldsVerifiedUnchanged: true,
});
console.log(`Published and verified the merged YRConnect case study and restored covers; transaction ${result.transactionId}.`);
