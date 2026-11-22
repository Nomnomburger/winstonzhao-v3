#!/usr/bin/env node
/**
 * Publish the rewritten case studies to Sanity (Newly, Yelo, Elapse, CoStudy,
 * Heatmap, Villio AI, Arca, Sparks, SmartBasket, CoCart, Hopper Hangout,
 * Augwa, Hack404 Launchpad).
 * A case study whose file isn't written yet is skipped.
 *
 * Preview: node scripts/update-newly-yelo-case-studies.mjs
 * Apply:   node scripts/update-newly-yelo-case-studies.mjs --apply
 * One:     node scripts/update-newly-yelo-case-studies.mjs --only yelo --apply
 *
 * Sources: content/figma-case-studies/newly-case-study.json and
 * yelo-case-study.json. Each file holds {documentId, fields, assets}. Image
 * and video paths in `assets` are relative to content/figma-case-studies;
 * blocks in `fields` point at them with localAssetKey, which this script
 * swaps for a reference to the uploaded Sanity asset.
 *
 * The existing documents are patched in place: slug, year, order and featured
 * are never touched, so the home page order and page addresses stay the same.
 * The title only changes when a case study file sets fields.title (the dry
 * run shows old → new). The previous state of every document is saved first,
 * so the update can be reverted.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@sanity/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'content/figma-case-studies');
const read = (name) => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(folder, name), `${JSON.stringify(value, null, 2)}\n`);

const SPECS = [
  { slug: 'newly', file: 'newly-case-study.json', id: 'figma-portfolio-newly' },
  { slug: 'yelo', file: 'yelo-case-study.json', id: 'figma-portfolio-yelo' },
  { slug: 'elapse', file: 'elapse-case-study.json', id: 'legacy-portfolio-elapsedesign' },
  { slug: 'costudy', file: 'costudy-case-study.json', id: 'figma-portfolio-costudy' },
  { slug: 'heatmap', file: 'heatmap-case-study.json', id: 'legacy-portfolio-heatmap' },
  { slug: 'villio-ai', file: 'villio-ai-case-study.json', id: 'figma-portfolio-villio-ai' },
  { slug: 'arca', file: 'arca-case-study.json', id: 'figma-portfolio-arca' },
  { slug: 'sparks', file: 'sparks-case-study.json', id: 'figma-portfolio-sparks' },
  { slug: 'smartbasket', file: 'smartbasket-case-study.json', id: 'figma-portfolio-smartbasket' },
  { slug: 'cocart', file: 'cocart-case-study.json', id: 'figma-portfolio-cocart' },
  { slug: 'hopper-hangout', file: 'hopper-hangout-case-study.json', id: 'legacy-portfolio-hopperhangout' },
  { slug: 'augwa', file: 'augwa-case-study.json', id: 'figma-portfolio-augwa' },
  { slug: 'hack404-launchpad', file: 'hack404-launchpad-case-study.json', id: 'figma-portfolio-hack404-launchpad' },
];
// Fields the case study files may change. Everything else on the document is
// left exactly as it is.
const ALLOWED = [
  'title', 'description', 'client', 'discipline', 'link', 'intro', 'hero', 'coverImage',
  'summary', 'details', 'overview', 'impact', 'sections', 'showSideMenu',
];
const PROTECTED = ['slug', 'year', 'order', 'featured'];

const args = process.argv.slice(2);
let apply = false;
let only = null;
let offline = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--apply') apply = true;
  else if (args[i] === '--dry-run') apply = false;
  else if (args[i] === '--offline') offline = true;
  else if (args[i] === '--only') only = args[++i];
  else throw new Error(`Unknown option ${args[i]}. Usage: node scripts/update-newly-yelo-case-studies.mjs [--apply | --offline] [--only ${SPECS.map((s) => s.slug).join('|')}]`);
}
if (apply && offline) throw new Error('--offline only validates the files; it cannot be combined with --apply.');
if (only && !SPECS.some((spec) => spec.slug === only)) throw new Error(`--only must be one of ${SPECS.map((s) => s.slug).join(', ')}`);
const specs = SPECS.filter((spec) => (!only || spec.slug === only) && fs.existsSync(path.join(folder, spec.file)));
for (const spec of SPECS) {
  if ((!only || spec.slug === only) && !specs.includes(spec)) console.log(`${spec.slug}: no ${spec.file} yet, skipped.`);
}
if (specs.length === 0) throw new Error('Nothing to publish: no case study file found.');

function getToken() {
  if (process.env.SANITY_API_TOKEN) return process.env.SANITY_API_TOKEN;
  const configPath = path.join(os.homedir(), '.config/sanity/config.json');
  if (!fs.existsSync(configPath)) return undefined;
  return JSON.parse(fs.readFileSync(configPath, 'utf8')).authToken || undefined;
}

// ---------------------------------------------------------------------------
// Validation (runs in dry-run too, so a broken file is caught before any upload)

function walk(value, visit, location) {
  visit(value, location);
  if (Array.isArray(value)) value.forEach((item, i) => walk(item, visit, `${location}[${i}]`));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walk(item, visit, `${location}.${key}`);
  }
}

function validate(spec, copy) {
  const where = spec.file;
  if (copy.documentId !== spec.id) throw new Error(`${where}: documentId must be ${spec.id}.`);
  const fields = copy.fields;
  if (!fields || typeof fields !== 'object') throw new Error(`${where}: fields is required.`);
  for (const key of Object.keys(fields)) {
    if (!ALLOWED.includes(key)) throw new Error(`${where}: fields.${key} is not allowed (protected or unknown).`);
  }
  if ('title' in fields && (typeof fields.title !== 'string' || !fields.title.trim() || fields.title !== fields.title.trim())) throw new Error(`${where}: title must be a non-empty string without leading or trailing spaces when set.`);
  if (typeof fields.description !== 'string' || !fields.description.trim()) throw new Error(`${where}: description is required.`);
  if (fields.description.length > 160) throw new Error(`${where}: description must be 160 characters or fewer.`);
  if (fields.showSideMenu !== true) throw new Error(`${where}: showSideMenu must be true (section navigation).`);
  if (!Array.isArray(fields.sections) || fields.sections.length < 4) throw new Error(`${where}: at least four sections are required.`);
  for (const section of fields.sections) {
    if (section._type !== 'projectSection' || !section.title?.trim()) throw new Error(`${where}: every section needs _type projectSection and a title.`);
    if (!Array.isArray(section.content) || !section.content.some((b) => b._type === 'block')) throw new Error(`${where}: section "${section.title}" needs text.`);
  }
  if (!Array.isArray(fields.hero) || fields.hero.length !== 1) throw new Error(`${where}: hero must hold exactly one image or video.`);
  if (!fields.coverImage || fields.coverImage._type !== 'image') throw new Error(`${where}: coverImage is required.`);
  const assets = copy.assets ?? {};
  for (const [key, asset] of Object.entries(assets)) {
    if (!asset.path) throw new Error(`${where}: asset ${key} needs a path.`);
    const abs = path.join(folder, asset.path);
    if (!fs.existsSync(abs) || fs.statSync(abs).size === 0) throw new Error(`${where}: asset ${key} is missing at ${asset.path}.`);
    if (!/\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(abs)) throw new Error(`${where}: unsupported asset type for ${key}.`);
    if (asset.existingAssetId && !/^(image|file)-[0-9a-f]{40}-/.test(asset.existingAssetId)) throw new Error(`${where}: asset ${key} has a malformed existingAssetId.`);
    if (!asset.sourceNodeIds?.length && !asset.sourceUrl && !asset.existingAssetId) throw new Error(`${where}: asset ${key} needs provenance (sourceNodeIds, sourceUrl or existingAssetId).`);
  }
  const used = new Set();
  walk(fields, (value, location) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    if (value.localAssetKey) {
      if (!assets[value.localAssetKey]) throw new Error(`${where}: ${location} refers to unknown asset ${value.localAssetKey}.`);
      used.add(value.localAssetKey);
    }
    if (value._type === 'mediaImage' || value._type === 'image') {
      if (!value.localAssetKey && !value.asset?._ref) throw new Error(`${where}: ${location} has no image.`);
      if (value._type === 'mediaImage' && !value.alt?.trim()) throw new Error(`${where}: ${location} needs alt text.`);
    }
    if (value._type === 'mediaImage' && 'labels' in value) {
      if (!Array.isArray(value.labels)) throw new Error(`${where}: ${location} labels must be a list.`);
      for (const l of value.labels) {
        const ok = l && l._type === 'imageLabel' && l._key && typeof l.text === 'string' && l.text.trim() && l.text.length <= 24
          && typeof l.x === 'number' && l.x >= 0 && l.x <= 1 && (l.y === undefined || (typeof l.y === 'number' && l.y >= 0 && l.y <= 1));
        if (!ok) throw new Error(`${where}: ${location} has a label without text, or with a position outside 0–1.`);
      }
    }
    if (value._type === 'image' && 'label' in value && (typeof value.label !== 'string' || !value.label.trim() || value.label.length > 24)) {
      throw new Error(`${where}: ${location} label must be short non-empty text.`);
    }
    if (value._type === 'stickyBoard') {
      const optionalText = (obj, keys, what) => {
        for (const k of keys) {
          if (k in obj && (typeof obj[k] !== 'string' || !obj[k].trim())) throw new Error(`${where}: ${location} ${what}${k} must be non-empty text when set.`);
        }
      };
      const unknown = Object.keys(value).filter((k) => !['_type', '_key', 'label', 'prompt', 'notes', 'caption'].includes(k));
      if (unknown.length) throw new Error(`${where}: ${location} has unknown fields ${unknown.join(', ')}.`);
      optionalText(value, ['label', 'prompt', 'caption'], '');
      if (!Array.isArray(value.notes) || value.notes.length === 0) throw new Error(`${where}: ${location} needs at least one note.`);
      const keys = new Set();
      for (const note of value.notes) {
        if (!note || typeof note !== 'object' || note._type !== 'stickyNote' || !note._key) throw new Error(`${where}: ${location} has a malformed note.`);
        if (keys.has(note._key)) throw new Error(`${where}: ${location} repeats note key ${note._key}.`);
        keys.add(note._key);
        const extra = Object.keys(note).filter((k) => !['_type', '_key', 'text', 'color', 'tag', 'highlight'].includes(k));
        if (extra.length) throw new Error(`${where}: ${location} note ${note._key} has unknown fields ${extra.join(', ')}.`);
        if (typeof note.text !== 'string' || !note.text.trim()) throw new Error(`${where}: ${location} has a note without text.`);
        if (!['yellow', 'pink', 'blue', 'green'].includes(note.color)) throw new Error(`${where}: ${location} has a note with unknown colour ${note.color}.`);
        optionalText(note, ['tag', 'highlight'], `note ${note._key} `);
        if (note.highlight && note.highlight.length > 16) throw new Error(`${where}: ${location} note ${note._key} highlight is longer than 16 characters.`);
      }
    }
    if (value._type === 'mediaVideo' && !value.file?.localAssetKey && !value.file?.asset?._ref && !value.url) {
      throw new Error(`${where}: ${location} needs a video file or url.`);
    }
  }, 'fields');
  for (const key of Object.keys(assets)) if (!used.has(key)) throw new Error(`${where}: asset ${key} is never used.`);
  walk(fields, (value, location) => {
    if (!Array.isArray(value)) return;
    const keys = new Set();
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item._key !== 'string' || !item._key) throw new Error(`${where}: array item at ${location} needs a _key.`);
      if (keys.has(item._key)) throw new Error(`${where}: duplicate _key ${item._key} at ${location}.`);
      keys.add(item._key);
    }
  }, 'fields');
  return { fields, assets };
}

// ---------------------------------------------------------------------------

const prepared = specs.map((spec) => ({ spec, copy: read(spec.file), ...validate(spec, read(spec.file)) }));
if (offline) {
  // Validation only (no network): useful where the Sanity API is not reachable.
  console.table(prepared.map(({ spec, fields, assets }) => ({
    project: spec.slug,
    sections: fields.sections.length,
    sectionTitles: fields.sections.map((s) => s.title).join(' · '),
    assets: Object.keys(assets).length,
    totalMB: (Object.values(assets).reduce((n, a) => n + fs.statSync(path.join(folder, a.path)).size, 0) / 1e6).toFixed(1),
  })));
  console.log('Offline check passed: files, keys and assets are valid. Run without --offline to compare against the live documents.');
  process.exit(0);
}

const token = getToken();
if (apply && !token) throw new Error('Sanity write authentication is missing. Set SANITY_API_TOKEN or log in with the Sanity CLI.');
const client = createClient({ projectId: '7k8ajlip', dataset: 'production', apiVersion: '2025-01-01', useCdn: false, perspective: 'published', token });

const ids = prepared.map(({ spec }) => spec.id);
const before = await client.fetch('*[_id in $ids]', { ids });
for (const { spec } of prepared) {
  if (!before.find((doc) => doc._id === spec.id)) throw new Error(`${spec.id} does not exist in Sanity; this script only updates existing projects.`);
}

const assetCount = prepared.reduce((n, p) => n + Object.keys(p.assets).length, 0);
console.table(prepared.map(({ spec, fields, assets }) => ({
  project: spec.slug,
  title: (() => {
    const current = before.find((doc) => doc._id === spec.id).title;
    return fields.title && fields.title !== current ? `${current} → ${fields.title}` : `${current} (unchanged)`;
  })(),
  sections: fields.sections.length,
  sectionTitles: fields.sections.map((s) => s.title).join(' · '),
  images: Object.values(assets).filter((a) => !/\.(mp4|webm)$/i.test(a.path)).length,
  videos: Object.values(assets).filter((a) => /\.(mp4|webm)$/i.test(a.path)).length,
})));

if (!apply) {
  console.log(`Dry run: ${specs.length} file(s) validated against the live documents; ${assetCount} assets ready to upload. Re-run with --apply to publish.`);
  process.exit(0);
}

save(`sanity-before-${specs.map((s) => s.slug).join('-')}-update.json`, { savedAt: new Date().toISOString(), projectId: '7k8ajlip', dataset: 'production', documents: before });

// Upload every asset once (Sanity de-duplicates identical files by content hash).
const uploaded = new Map();
for (const { spec, assets } of prepared) {
  for (const [key, asset] of Object.entries(assets)) {
    // Already in Sanity (e.g. an image Winston uploaded in Studio): reference it
    // as is. The local file is only a copy for the offline preview.
    if (asset.existingAssetId) {
      asset.assetId = asset.existingAssetId;
      console.log(`Kept ${spec.slug}/${key} → ${asset.assetId}`);
      continue;
    }
    const abs = path.join(folder, asset.path);
    const buffer = fs.readFileSync(abs);
    const sha1 = createHash('sha1').update(buffer).digest('hex');
    const kind = /\.(mp4|webm)$/i.test(abs) ? 'file' : 'image';
    let result = uploaded.get(sha1);
    if (!result) {
      result = await client.assets.upload(kind, buffer, {
        filename: path.basename(abs),
        source: { name: 'figma', id: asset.sourceNodeIds?.join(',') ?? asset.sourceUrl, url: asset.sourceUrl },
      });
      uploaded.set(sha1, result);
      console.log(`Uploaded ${spec.slug}/${key} → ${result._id}`);
    }
    asset.assetId = result._id;
  }
}

function resolve(value, assets) {
  if (Array.isArray(value)) return value.map((item) => resolve(item, assets));
  if (!value || typeof value !== 'object') return value;
  const { localAssetKey, ...rest } = value;
  const out = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, resolve(v, assets)]));
  if (localAssetKey) out.asset = { _type: 'reference', _ref: assets[localAssetKey].assetId };
  return out;
}

let transaction = client.transaction();
const sets = prepared.map(({ spec, fields, assets }) => {
  const doc = before.find((d) => d._id === spec.id);
  const set = resolve(fields, assets);
  transaction = transaction.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set(set));
  return { doc, set };
});
const result = await transaction.commit({ visibility: 'sync', returnDocuments: false });

const after = await client.fetch('*[_id in $ids]', { ids });
const strip = (doc) => Object.fromEntries(Object.entries(doc).filter(([k]) => !['_rev', '_updatedAt'].includes(k)));
for (const { doc, set } of sets) {
  const actual = after.find((d) => d._id === doc._id);
  if (!actual || !isDeepStrictEqual(strip(actual), strip({ ...doc, ...set }))) throw new Error(`Published verification failed for ${doc.title}.`);
  for (const key of PROTECTED) {
    if (!isDeepStrictEqual(actual[key], doc[key])) throw new Error(`${doc.title}: protected field ${key} changed.`);
  }
}

save(`${specs.map((s) => s.slug).join('-')}-update-result.json`, {
  publishedAt: new Date().toISOString(),
  transactionId: result.transactionId,
  projects: prepared.map(({ spec, fields, assets }) => ({
    id: spec.id,
    slug: spec.slug,
    sectionTitles: fields.sections.map((s) => s.title),
    assets: Object.fromEntries(Object.entries(assets).map(([k, a]) => [k, { path: a.path, assetId: a.assetId, sourceNodeIds: a.sourceNodeIds }])),
  })),
});
console.log(`Published and verified ${prepared.map((p) => p.spec.slug).join(' and ')}; transaction ${result.transactionId}.`);
