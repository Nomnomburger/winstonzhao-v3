#!/usr/bin/env node
// Preview: node scripts/update-featured-project-images.mjs
// Publish: node scripts/update-featured-project-images.mjs --apply
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
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/update-featured-project-images.mjs [--apply]');
const ids = ['legacy-portfolio-heatmap', 'legacy-portfolio-yrconnect', 'legacy-portfolio-hopperhangout', 'legacy-portfolio-elapsedesign'];
const imageIds = ids.slice(2);
const plan = read('hero-layout-adjustments.json');
const originals = read('cover-restoration-plan.json').projects;
if (!isDeepStrictEqual(plan.projects.map(project => project.id).sort(), [...imageIds].sort())) throw new Error('Image plan must contain exactly Hopper and Elapse.');
const token = process.env.SANITY_API_TOKEN || JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
if (!token) throw new Error('Sanity authentication is required.');
const client = createClient({projectId: '7k8ajlip', dataset: 'production', apiVersion: '2025-01-01', useCdn: false, perspective: 'published', token});
const before = await client.fetch('*[_id in $ids]', {ids});
const find = id => {
  const doc = before.find(doc => doc._id === id);
  if (!doc || !doc.featured) throw new Error(`Missing featured project ${id}.`);
  return doc;
};
const references = sections => sections.flatMap(section => section.content ?? []).filter(block => block._type === 'mediaImage').map(block => block.asset?._ref).sort();
const imageUpdates = plan.projects.map(project => {
  const doc = find(project.id);
  const original = originals.find(item => item.id === doc._id);
  if (project.title !== doc.title || !isDeepStrictEqual(project.hero, original.originalHero)) throw new Error(`Unexpected main image for ${doc.title}.`);
  const straightOn = doc.hero?.[0]?.asset?._ref;
  if (!straightOn || straightOn === original.originalHero[0].asset._ref) throw new Error(`${doc.title}: expected the straight-on image as the current hero.`);
  const expected = [...references(doc.sections), straightOn].sort();
  if (!isDeepStrictEqual(references(project.sections), expected)) throw new Error(`${doc.title}: retain every existing image and add the straight-on export once.`);
  const retained = project.sections.map(section => ({...section, content: section.content.filter(block => block._type !== 'mediaImage' || block.asset?._ref !== straightOn)}));
  if (!isDeepStrictEqual(retained, doc.sections)) throw new Error(`${doc.title}: unexpected change to existing case study text or media.`);
  const added = project.sections.flatMap(section => section.content).find(block => block._type === 'mediaImage' && block.asset?._ref === straightOn);
  if (!added.alt?.trim() || !added.caption?.trim() || !added._key) throw new Error(`${doc.title}: the straight-on image requires alt text, a caption, and a key.`);
  for (const section of project.sections) {
    const keys = section.content.map(block => block._key);
    if (keys.some(key => !key) || new Set(keys).size !== keys.length) throw new Error(`${doc.title}: duplicate or missing content keys.`);
  }
  return {doc, set: {hero: project.hero, sections: project.sections}, straightOn};
});
const updates = [{doc: find(ids[0]), set: {order: 1}}, {doc: find(ids[1]), set: {order: 2}}, ...imageUpdates];
const imageRefs = [...new Set(imageUpdates.flatMap(({set, straightOn}) => [set.hero[0].asset._ref, straightOn]))];
const assets = await client.fetch('*[_type == "sanity.imageAsset" && _id in $ids]._id', {ids: imageRefs});
if (assets.length !== imageRefs.length) throw new Error('A required project image is missing from Sanity.');
console.table(updates.map(({doc, set}) => ({project: doc.title, changes: Object.keys(set).join(', ')})));
if (!args.includes('--apply')) {
  console.log('Dry run validated Heatmap before YRConnect, original main mockups, and straight-on images within the studies. No content changed.');
  process.exit(0);
}
save('sanity-before-final-featured-image-update.json', {savedAt: new Date().toISOString(), documents: before});
let transaction = client.transaction();
for (const {doc, set} of updates) transaction = transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set(set));
const result = await transaction.commit({visibility: 'sync', returnDocuments: false});
const after = await client.fetch('*[_id in $ids]', {ids});
const content = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt'].includes(key)));
for (const {doc, set} of updates) {
  const actual = after.find(item => item._id === doc._id);
  if (!actual || !isDeepStrictEqual(content(actual), content({...doc, ...set}))) throw new Error(`Published verification failed for ${doc.title}.`);
}
// Keep the saved case studies consistent with the final image placement.
for (const [filename, id] of [['elapse-expanded-copy.json', ids[3]], ['hopper-expanded-copy.json', ids[2]], ['yrconnect-expanded-copy.json', ids[1]]]) {
  const copy = read(filename);
  const fields = copy.fields ?? copy.document;
  const doc = after.find(item => item._id === id);
  fields.sections = doc.sections;
  fields.hero = doc.hero;
  for (const field of ['coverImage', 'order']) if (field in fields) fields[field] = doc[field];
  save(filename, copy);
}
const dates = read('project-dates.json');
for (const project of dates.projects) {
  if (project.id === ids[0]) project.order = 1;
  if (project.id === ids[1]) project.order = 2;
}
save('project-dates.json', dates);
save('featured-image-layout-result.json', {
  publishedAt: new Date().toISOString(), transactionId: result.transactionId,
  featuredOrder: after.sort((a, b) => a.order - b.order).map(doc => ({id: doc._id, title: doc.title, order: doc.order})),
  mainMockups: after.map(doc => ({id: doc._id, asset: doc.hero[0].asset._ref})),
  addedStraightOnImages: imageUpdates.map(({doc, straightOn}) => ({id: doc._id, asset: straightOn})),
  allUnrelatedFieldsVerifiedUnchanged: true,
});
console.log(`Published and verified featured order and case study image placement; transaction ${result.transactionId}.`);
