#!/usr/bin/env node
// Swap which projects are featured on the home page and renumber the list.
// Preview: node scripts/rearrange-featured-projects.mjs
// Apply:   node scripts/rearrange-featured-projects.mjs --apply
//
// Featured cards, in grid order: Newly, Heatmap Portal Redesign, Elapse App
// Design, Yelo App (renamed from Yelo). YRConnect and Hopper Hangout move to
// the list below, which is renumbered newest first using the researched dates
// in content/figma-case-studies/project-dates.json. Drafts and mock projects
// are left alone. The previous state is saved so the change can be reverted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@sanity/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'content/figma-case-studies');
const read = (name) => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(folder, name), `${JSON.stringify(value, null, 2)}\n`);
const plan = read('project-dates.json');
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--apply')) throw new Error('Usage: node scripts/rearrange-featured-projects.mjs [--apply]');
const apply = args.includes('--apply');
const token = process.env.SANITY_API_TOKEN || JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
if (!token) throw new Error('A Sanity token is required.');
const client = createClient({ projectId: plan.projectId, dataset: plan.dataset, apiVersion: '2025-01-01', useCdn: false, perspective: 'raw', token });

const FEATURED = ['newly', 'heatmap-portal-redesign', 'elapse-app-design', 'yelo'];
const RENAMES = { yelo: 'Yelo App' };

const query = '*[_type == "project" && !(_id in path("drafts.**")) && !(_id match "mock-project-*") && !(lower(coalesce(title, "")) match "test project*")]';
const before = await client.fetch(query);
const dates = new Map(plan.projects.map((item) => [item.slug, item]));
const bySlug = new Map(before.map((doc) => [doc.slug?.current, doc]));
for (const slug of FEATURED) if (!bySlug.has(slug)) throw new Error(`Published project "${slug}" not found.`);
for (const doc of before) {
  if (!dates.has(doc.slug?.current)) throw new Error(`No researched date for ${doc.title}. Refresh project-dates.json first.`);
  if (await client.fetch('defined(*[_id == $id][0]._id)', { id: `drafts.${doc._id}` })) {
    throw new Error(`${doc.title} has an unpublished draft. Publish or discard it first so the change is not overwritten.`);
  }
}

const score = (slug) => Number(dates.get(slug).sortDate.replaceAll('-', '').padEnd(8, '0'));
const list = before
  .filter((doc) => !FEATURED.includes(doc.slug.current))
  .sort((a, b) => b.year - a.year || score(b.slug.current) - score(a.slug.current) || (a.order ?? Infinity) - (b.order ?? Infinity));
const changes = [
  ...FEATURED.map((slug, index) => ({ doc: bySlug.get(slug), set: { featured: true, order: index + 1, title: RENAMES[slug] ?? bySlug.get(slug).title } })),
  ...list.map((doc, index) => ({ doc, set: { featured: false, order: FEATURED.length + index + 1, title: doc.title } })),
].map((change) => ({ ...change, changed: Object.keys(change.set).some((key) => !isDeepStrictEqual(change.set[key], change.doc[key])) }));

console.table(changes.map(({ doc, set, changed }) => ({ order: set.order, title: set.title, featured: set.featured, year: doc.year, was: `${doc.featured ? '★' : 'list'} #${doc.order ?? '-'}`, changed })));
const pending = changes.filter((change) => change.changed);
if (!apply) {
  console.log(`Dry run: ${pending.length} projects would change.`);
  process.exit(0);
}

save('sanity-before-featured-rearrange.json', { savedAt: new Date().toISOString(), projectId: plan.projectId, dataset: plan.dataset, documents: before });
let transaction = client.transaction();
for (const { doc, set } of pending) transaction = transaction.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set(set));
const { transactionId } = await transaction.commit({ visibility: 'sync', returnDocuments: false });

const after = await client.fetch(query);
const stripMetadata = (doc) => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt'].includes(key)));
if (after.length !== before.length) throw new Error('Project count changed during verification.');
for (const { doc, set } of changes) {
  const actual = after.find((p) => p._id === doc._id);
  if (!actual || !isDeepStrictEqual(stripMetadata(actual), stripMetadata({ ...doc, ...set }))) throw new Error(`Verification failed for ${doc.title}.`);
}

// Keep the local mirrors of the published documents consistent.
for (const { doc, set } of changes) {
  const date = dates.get(doc.slug.current);
  date.order = set.order;
  date.featured = set.featured;
}
save('project-dates.json', plan);
const manifest = read('manifest.json');
for (const entry of manifest.projects) {
  const change = changes.find((p) => p.doc._id === (entry.existingId || entry.id));
  if (!change) continue;
  entry.document.title = change.set.title;
  entry.document.featured = change.set.featured;
  entry.document.order = change.set.order;
}
save('manifest.json', manifest);
save('featured-rearrange-result.json', {
  verifiedAt: new Date().toISOString(),
  transactionId,
  changedProjectCount: pending.length,
  featured: changes.filter((p) => p.set.featured).map((p) => ({ id: p.doc._id, title: p.set.title, order: p.set.order })),
  list: changes.filter((p) => !p.set.featured).map((p) => ({ id: p.doc._id, title: p.set.title, year: p.doc.year, order: p.set.order })),
  renamed: Object.entries(RENAMES).map(([slug, title]) => ({ slug, from: bySlug.get(slug).title, to: title })),
});
console.log(`Verified ${pending.length} updates; transaction ${transactionId}.`);
