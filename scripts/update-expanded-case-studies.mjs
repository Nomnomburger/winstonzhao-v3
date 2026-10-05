#!/usr/bin/env node
// Preview: node scripts/update-expanded-case-studies.mjs
// Publish: node scripts/update-expanded-case-studies.mjs --apply
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
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/update-expanded-case-studies.mjs [--apply]');
const apply = args.includes('--apply');
const specs = [
  {file: 'elapse-expanded-copy.json', id: 'legacy-portfolio-elapsedesign'},
  {file: 'hopper-expanded-copy.json', id: 'legacy-portfolio-hopperhangout'},
];
const allowed = ['description', 'intro', 'summary', 'overview', 'impact', 'details', 'sections', 'showSideMenu'];
const protectedFields = ['title', 'slug', 'year', 'order', 'featured', 'coverImage', 'hero', 'client', 'discipline', 'link'];
const token = process.env.SANITY_API_TOKEN || JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
if (!token) throw new Error('Sanity authentication is required.');
const client = createClient({projectId: '7k8ajlip', dataset: 'production', apiVersion: '2025-01-01', useCdn: false, perspective: 'published', token});
const ids = specs.map(spec => spec.id);
const before = await client.fetch('*[_id in $ids]', {ids});
const references = sections => sections.flatMap(section => section.content ?? []).filter(block => block._type === 'mediaImage').map(block => block.asset?._ref).sort();

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

const updates = specs.map(spec => {
  const copy = read(spec.file);
  const doc = before.find(doc => doc._id === spec.id);
  if (!doc || copy.documentId !== spec.id) throw new Error(`${spec.file}: incorrect existing project ID.`);
  const fields = copy.fields ?? copy.document;
  if (fields.showSideMenu !== true || fields.sections.length < 4) throw new Error(`${doc.title}: complete sections and side navigation are required.`);
  if (!fields.description?.trim() || fields.description.length > 160) throw new Error(`${doc.title}: invalid description.`);
  if (fields.sections.some(section => !section.title?.trim() || !section.heading?.trim() || !section.content?.some(block => block._type === 'block'))) {
    throw new Error(`${doc.title}: every chapter requires a navigation label, heading, and text.`);
  }
  for (const key of protectedFields) {
    if (key in fields && !isDeepStrictEqual(fields[key], doc[key])) throw new Error(`${doc.title}: unexpected change to ${key}.`);
  }
  if (!isDeepStrictEqual(references(fields.sections), references(doc.sections))) throw new Error(`${doc.title}: existing body images must be retained exactly once.`);
  const set = Object.fromEntries(allowed.filter(key => key in fields).map(key => [key, fields[key]]));
  validateKeys(set);
  return {doc, set, sourceFile: spec.file, sourceNotes: copy.sourceNotes ?? copy.provenance};
});
console.table(updates.map(({doc, set}) => ({project: doc.title, sections: set.sections.length, bodyImages: references(set.sections).length, sideNavigation: set.showSideMenu})));
if (!apply) {
  console.log('Dry run validated both expanded case studies. No content changed.');
  process.exit(0);
}
save('sanity-before-case-study-update.json', {savedAt: new Date().toISOString(), projectId: '7k8ajlip', dataset: 'production', documents: before});
let transaction = client.transaction();
for (const {doc, set} of updates) transaction = transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set(set));
const result = await transaction.commit({visibility: 'sync', returnDocuments: false});
const after = await client.fetch('*[_id in $ids]', {ids});
const strip = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt'].includes(key)));
for (const {doc, set} of updates) {
  const actual = after.find(item => item._id === doc._id);
  if (!actual || !isDeepStrictEqual(strip(actual), strip({...doc, ...set}))) throw new Error(`Published verification failed for ${doc.title}.`);
}
save('expanded-case-study-result.json', {publishedAt: new Date().toISOString(), transactionId: result.transactionId, allProtectedFieldsVerifiedUnchanged: true, projects: updates.map(({doc, set, sourceFile, sourceNotes}) => ({id: doc._id, title: doc.title, slug: doc.slug.current, sourceFile, sourceNotes, sectionTitles: set.sections.map(section => section.title), sideNavigation: true, retainedBodyImages: references(set.sections)}))});
console.log(`Published and verified both case studies; transaction ${result.transactionId}.`);
