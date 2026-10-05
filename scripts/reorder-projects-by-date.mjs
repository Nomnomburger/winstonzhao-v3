#!/usr/bin/env node
// Preview: node scripts/reorder-projects-by-date.mjs
// Apply:   node scripts/reorder-projects-by-date.mjs --apply
// Project dates and their evidence are in content/figma-case-studies/project-dates.json.
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
const plan = read('project-dates.json');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/reorder-projects-by-date.mjs [--apply]');
const apply = args.includes('--apply');
const token = process.env.SANITY_API_TOKEN || JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
if (!token) throw new Error('A Sanity token is required.');
const client = createClient({projectId: plan.projectId, dataset: plan.dataset, apiVersion: '2025-01-01', useCdn: false, perspective: 'raw', token});
const query = '*[_type == "project" && !(_id in path("drafts.**")) && !(_id match "mock-project-*") && !(lower(coalesce(title, "")) match "test project*")]';
const before = await client.fetch(query);
const dates = new Map(plan.projects.map(item => [item.id, item]));
if (dates.size !== plan.projects.length || before.length !== dates.size || before.some(p => !dates.has(p._id))) {
  throw new Error('Published projects differ from the researched date plan. Refresh the plan before applying.');
}
for (const doc of before) {
  const date = dates.get(doc._id);
  if (date.slug !== doc.slug?.current || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date.sortDate) || Number(date.sortDate.slice(0, 4)) !== date.year) {
    throw new Error(`Invalid date plan for ${doc.title}.`);
  }
}

const score = date => Number(date.sortDate.replaceAll('-', '').padEnd(8, '0'));
const rows = before.filter(p => !p.featured).sort((a, b) => score(dates.get(b._id)) - score(dates.get(a._id)) || (a.order ?? Infinity) - (b.order ?? Infinity));
const firstOrder = Math.max(0, ...before.filter(p => p.featured).map(p => p.order ?? 0)) + 1;
const changes = rows.map((doc, index) => {
  const date = dates.get(doc._id);
  const set = {order: firstOrder + index, year: date.year};
  if (date.updateTimeline) {
    const details = structuredClone(doc.details ?? []);
    const existing = details.find(d => d.label === 'Timeline' || d.label === 'Year');
    if (existing) { existing.label = 'Timeline'; existing.value = date.displayDate; }
    else details.push({_type: 'detailItem', _key: 'detail-timeline', label: 'Timeline', value: date.displayDate});
    set.details = details;
  }
  const changed = Object.keys(set).some(key => !isDeepStrictEqual(set[key], doc[key]));
  return {doc, date, set, changed};
});
console.table(changes.map(({doc, date, set}) => ({order: set.order, title: doc.title, date: date.displayDate, previousYear: doc.year, year: set.year})));
const pending = changes.filter(change => change.changed);
if (!apply) {
  console.log(`Dry run: ${pending.length} projects would change. Featured positions are preserved.`);
  process.exit(0);
}

save('sanity-before-chronological-update.json', {savedAt: new Date().toISOString(), projectId: plan.projectId, dataset: plan.dataset, documents: before});
let transactionId = null;
if (pending.length) {
  let transaction = client.transaction();
  for (const {doc, set} of pending) transaction = transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set(set));
  const result = await transaction.commit({visibility: 'sync', returnDocuments: false});
  transactionId = result.transactionId;
}
const after = await client.fetch(query);
const stripMetadata = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt'].includes(key)));
for (const doc of before) {
  const actual = after.find(p => p._id === doc._id);
  const change = changes.find(p => p.doc._id === doc._id);
  const expected = change ? {...doc, ...change.set} : doc;
  if (!actual || !isDeepStrictEqual(stripMetadata(actual), stripMetadata(expected))) throw new Error(`Verification failed for ${doc.title}.`);
}
if (after.length !== before.length) throw new Error('Project count changed during verification.');

// Keep the reusable import content consistent with the published chronology.
for (const name of ['root-copy.json', 'consumer-copy.json', 'civic-art-copy.json']) {
  const copy = read(name);
  for (const item of copy) {
    const change = changes.find(p => p.date.slug === item.slug);
    if (!change) continue;
    item.year = change.date.year;
    item.yearSource = change.date.sourceSummary;
    if (change.date.updateTimeline) {
      const detail = item.details.find(d => d.label === 'Timeline' || d.label === 'Year');
      if (detail) {detail.label = 'Timeline'; detail.value = change.date.displayDate;}
      else item.details.push({label: 'Timeline', value: change.date.displayDate});
    }
  }
  save(name, copy);
}
const manifest = read('manifest.json');
for (const entry of manifest.projects) {
  const change = changes.find(p => p.doc._id === (entry.existingId || entry.id));
  if (!change) continue;
  entry.document.year = change.set.year;
  entry.document.order = change.set.order;
  if (change.set.details) entry.document.details = change.set.details;
  entry.yearSource = change.date.sourceSummary;
}
save('manifest.json', manifest);
for (const {date, set} of changes) date.order = set.order;
save('project-dates.json', plan);
save('chronological-update-result.json', {verifiedAt: new Date().toISOString(), transactionId, changedProjectCount: pending.length, yearCorrections: changes.filter(p => p.doc.year !== p.set.year).map(p => ({title: p.doc.title, from: p.doc.year, to: p.set.year})), orderedList: changes.map(p => ({id: p.doc._id, title: p.doc.title, slug: p.date.slug, year: p.set.year, order: p.set.order, date: p.date.displayDate})), preservedFeaturedProjects: before.filter(p => p.featured).map(p => p._id), allOtherFieldsVerifiedUnchanged: true});
console.log(`Verified ${pending.length} updates; transaction ${transactionId ?? '(no changes)'}.`);
