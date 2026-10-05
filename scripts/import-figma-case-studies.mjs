#!/usr/bin/env node
/**
 * Import source-grounded case studies without replacing existing project copy.
 *
 * Preview: node scripts/import-figma-case-studies.mjs
 * Apply:   node scripts/import-figma-case-studies.mjs --apply
 *
 * Manifest: content/figma-case-studies/manifest.json
 * Each entry has {status, document, images: {cover, hero, additional: []}}.
 * Image paths are relative to the manifest. Additional images have a unique
 * key; mediaImage objects in document.sections use localAssetKey to refer to it.
 * An existing project is skipped unless existingId and replaceImages: true are
 * both supplied. In that case only supplied coverImage / hero images change.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'content/figma-case-studies/manifest.json');
const DEFAULT_RESULT = path.join(ROOT, 'content/figma-case-studies/import-result.json');
const DEFAULT_PROJECT = '7k8ajlip';
const DEFAULT_DATASET = 'production';

export const normalizeTitle = (value) => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function fail(message) { throw new Error(message); }

function parseArgs(args) {
  const options = { apply: false, manifest: DEFAULT_MANIFEST, result: DEFAULT_RESULT };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg === '--manifest' || arg === '--result') {
      const value = args[++i];
      if (!value || value.startsWith('--')) fail(`${arg} requires a file path.`);
      options[arg.slice(2)] = path.resolve(value);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/import-figma-case-studies.mjs [--dry-run | --apply] [--manifest path] [--result path]');
      return null;
    } else fail(`Unknown option: ${arg}`);
  }
  if (args.includes('--apply') && args.includes('--dry-run')) fail('Choose either --apply or --dry-run.');
  return options;
}

function getToken() {
  if (process.env.SANITY_API_TOKEN) return process.env.SANITY_API_TOKEN;
  const configPath = path.join(os.homedir(), '.config/sanity/config.json');
  if (!fs.existsSync(configPath)) return undefined;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.authToken || undefined;
}

function figmaUrl(source = {}) {
  if (source.sourceUrl) return source.sourceUrl;
  if (!source.fileKey) return source.url;
  const suffix = source.nodeId ? `?node-id=${encodeURIComponent(source.nodeId.replace(/:/g, '-'))}` : '';
  return `https://www.figma.com/design/${source.fileKey}${suffix}`;
}

function imageSpecs(entry) {
  const specs = [];
  for (const key of ['cover', 'hero']) {
    if (entry.images?.[key]) specs.push({ ...entry.images[key], key });
  }
  if (entry.images?.additional !== undefined && !Array.isArray(entry.images.additional)) {
    fail(`${entry.document?.title}: images.additional must be an array.`);
  }
  specs.push(...(entry.images?.additional ?? []));
  return specs;
}

function walk(value, visit, location = 'document') {
  visit(value, location);
  if (Array.isArray(value)) value.forEach((item, i) => walk(item, visit, `${location}[${i}]`));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walk(item, visit, `${location}.${key}`);
  }
}

export function validateManifest(manifest, manifestPath) {
  if (!Array.isArray(manifest.projects) || manifest.projects.length === 0) fail('Manifest requires a nonempty projects array.');
  const seenTitles = new Set();
  const seenSlugs = new Set();
  const seenIds = new Set();
  return manifest.projects.map((entry) => {
    const document = structuredClone(entry.document ?? {});
    const title = document.title?.trim();
    const slug = typeof document.slug === 'string' ? document.slug : document.slug?.current;
    if (!title) fail('Every project requires document.title.');
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(`${title}: provide a valid lowercase document.slug.`);
    if (!['draft', 'published'].includes(entry.status)) fail(`${title}: status must be draft or published.`);
    if (document.year !== undefined && (!Number.isInteger(document.year) || document.year < 1990 || document.year > 2100)) {
      fail(`${title}: year must be an integer from 1990 to 2100, or omitted for a draft.`);
    }
    if (entry.status === 'published' && document.year === undefined) fail(`${title}: published projects require a sourced or user-confirmed year.`);
    if (typeof document.description !== 'string' || !document.description.trim()) fail(`${title}: description is required.`);
    if (document.description.length > 160) fail(`${title}: description must be 160 characters or fewer.`);
    if (entry.replaceImages && !entry.existingId) fail(`${title}: replaceImages requires an explicit existingId.`);
    const id = entry.id || `figma-portfolio-${slug}`;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) fail(`${title}: id must contain only letters, numbers, dashes and underscores, without a drafts prefix.`);
    if (seenTitles.has(normalizeTitle(title)) || seenSlugs.has(slug) || seenIds.has(id)) fail(`${title}: duplicate title, slug or id within manifest.`);
    seenTitles.add(normalizeTitle(title)); seenSlugs.add(slug); seenIds.add(id);
    const specs = imageSpecs(entry);
    const keys = new Set();
    for (const spec of specs) {
      if (!spec.key || keys.has(spec.key)) fail(`${title}: every local image requires a unique key.`);
      keys.add(spec.key);
      if (!spec.path || typeof spec.path !== 'string') fail(`${title}: image ${spec.key} requires a local path.`);
      spec.absolutePath = path.resolve(path.dirname(manifestPath), spec.path);
      const stat = fs.statSync(spec.absolutePath);
      if (!stat.isFile() || stat.size === 0) fail(`${title}: image ${spec.key} is empty or is not a file.`);
      if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(spec.absolutePath)) fail(`${title}: unsupported image format for ${spec.key}.`);
      const source = { ...manifest.source, ...spec };
      spec.sourceUrl = figmaUrl(source);
      if (!spec.sourceUrl || !/^https:\/\/(www\.)?figma\.com\//.test(spec.sourceUrl)) fail(`${title}: image ${spec.key} requires Figma source provenance.`);
      spec.fileKey = source.fileKey;
      spec.nodeId = source.nodeId;
    }
    if (!keys.has('cover') && !document.coverImage?.asset?._ref) fail(`${title}: a cover image is required.`);
    if (document.hero && (!Array.isArray(document.hero) || document.hero.length > 1)) fail(`${title}: hero must contain at most one image or video.`);
    walk(document, (value, location) => {
      if (!value || typeof value !== 'object') return;
      if (value.localAssetKey && !keys.has(value.localAssetKey)) fail(`${title}: ${location} refers to unknown localAssetKey ${value.localAssetKey}.`);
      if (Array.isArray(value)) {
        const itemKeys = new Set();
        for (const item of value) {
          if (!item || typeof item !== 'object') continue;
          if (typeof item._key !== 'string' || !item._key) fail(`${title}: array object at ${location} requires _key.`);
          if (itemKeys.has(item._key)) fail(`${title}: duplicate array _key at ${location}.`);
          itemKeys.add(item._key);
        }
      }
    });
    document._type = 'project'; document.title = title;
    document.slug = { _type: 'slug', current: slug };
    for (const key of ['_id', '_rev', '_createdAt', '_updatedAt']) delete document[key];
    return { entry, document, id, slug, specs };
  });
}

export function planImport(entries, existing) {
  return entries.map((prepared) => {
    const { entry, document, id, slug } = prepared;
    const explicit = entry.existingId && existing.find((doc) => doc._id === entry.existingId);
    if (entry.existingId && !explicit) fail(`${document.title}: explicit existingId ${entry.existingId} does not exist.`);
    const candidates = existing.filter((doc) =>
      doc._id === id || doc._id === `drafts.${id}` || doc.slug?.current === slug || normalizeTitle(doc.title) === normalizeTitle(document.title));
    if (explicit && candidates.some((doc) => doc._id.replace(/^drafts\./, '') !== explicit._id.replace(/^drafts\./, ''))) {
      fail(`${document.title}: title or slug matches a different existing project.`);
    }
    const matched = explicit || candidates.find((doc) => !doc._id.startsWith('drafts.')) || candidates[0];
    if (!matched && entry.replaceImages) fail(`${document.title}: cannot replace images without an existing project.`);
    const action = matched ? (entry.existingId && entry.replaceImages ? 'update-images' : 'skip-existing') : 'create';
    if (action === 'update-images' && !prepared.specs.some((spec) => ['cover', 'hero'].includes(spec.key))) {
      fail(`${document.title}: no cover or hero image supplied for replacement.`);
    }
    const targetId = matched?._id || (entry.status === 'draft' ? `drafts.${id}` : id);
    return { ...prepared, action, targetId, matched };
  });
}

export function resolveLocalAssets(value, assets) {
  if (Array.isArray(value)) return value.map((item) => resolveLocalAssets(item, assets));
  if (!value || typeof value !== 'object') return value;
  const { localAssetKey, ...rest } = value;
  const out = Object.fromEntries(Object.entries(rest).map(([key, item]) => [key, resolveLocalAssets(item, assets)]));
  if (localAssetKey) out.asset = { _type: 'reference', _ref: assets.get(localAssetKey) };
  return out;
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (!options) return;
  const manifest = JSON.parse(fs.readFileSync(options.manifest, 'utf8'));
  const entries = validateManifest(manifest, options.manifest);
  const projectId = manifest.projectId || DEFAULT_PROJECT;
  const dataset = manifest.dataset || DEFAULT_DATASET;
  if (projectId !== DEFAULT_PROJECT || dataset !== DEFAULT_DATASET) fail(`This importer is limited to ${DEFAULT_PROJECT}/${DEFAULT_DATASET}.`);
  const token = getToken();
  if (options.apply && !token) fail('Sanity write authentication is missing. Set SANITY_API_TOKEN or use a logged-in Sanity CLI session.');
  const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', useCdn: false, perspective: 'raw', token });
  const existing = await client.fetch('*[_type == "project" && !(_id match "mock-project-*") && !(lower(coalesce(title, "")) match "test project*")]');
  const plan = planImport(entries, existing);
  const result = { generatedAt: new Date().toISOString(), mode: options.apply ? 'apply' : 'dry-run', projectId, dataset, manifest: options.manifest, results: [] };
  const saveResult = () => {
    fs.mkdirSync(path.dirname(options.result), { recursive: true });
    fs.writeFileSync(options.result, `${JSON.stringify(result, null, 2)}\n`);
  };
  result.state = 'planned';
  saveResult();
  const tx = client.transaction();
  let mutationCount = 0;
  try {
  for (const item of plan) {
    const record = { title: item.document.title, id: item.targetId, slug: item.matched?.slug?.current || item.slug, status: item.targetId.startsWith('drafts.') ? 'draft' : 'published', action: item.action, images: [] };
    result.results.push(record);
    console.log(`${item.action}: ${record.title} (${record.id})`);
    if (item.action === 'skip-existing') {
      record.reason = 'Existing project retained; no explicit image replacement requested.';
      continue;
    }
    const specs = item.action === 'update-images' ? item.specs.filter((spec) => ['cover', 'hero'].includes(spec.key)) : item.specs;
    const assets = new Map();
    for (const spec of specs) {
      const imageResult = { key: spec.key, path: spec.path, sourceUrl: spec.sourceUrl };
      record.images.push(imageResult);
      if (!options.apply) continue;
      const asset = await client.assets.upload('image', fs.createReadStream(spec.absolutePath), {
        filename: `${item.slug}-${spec.key}${path.extname(spec.absolutePath).toLowerCase()}`,
        label: `${record.title} — ${spec.key}`,
        source: { name: 'figma-case-studies', id: `${spec.fileKey || 'figma'}:${spec.nodeId || spec.key}:${spec.key}`, url: spec.sourceUrl },
      });
      assets.set(spec.key, asset._id); imageResult.assetId = asset._id;
      saveResult();
    }
    if (!options.apply) continue;
    const image = (key, type) => {
      const spec = specs.find((candidate) => candidate.key === key);
      return spec && { _type: type, asset: { _type: 'reference', _ref: assets.get(key) }, alt: spec.alt || `${record.title} ${key === 'cover' ? 'project cover' : 'interface'}` };
    };
    const replacement = {};
    if (assets.has('cover')) replacement.coverImage = image('cover', 'image');
    if (assets.has('hero')) replacement.hero = [{ ...image('hero', 'mediaImage'), _key: 'hero', size: 'full', ...(item.entry.images.hero.caption ? { caption: item.entry.images.hero.caption } : {}) }];
    if (item.action === 'update-images') {
      tx.patch(item.targetId, (patch) => patch.ifRevisionId(item.matched._rev).set(replacement));
    } else {
      const doc = { ...resolveLocalAssets(item.document, assets), ...replacement, _id: item.targetId };
      tx.create(doc);
    }
    mutationCount++;
  }
  if (options.apply && mutationCount) {
    result.state = 'committing';
    saveResult();
    const committed = await tx.commit({ visibility: 'sync' });
    result.transactionId = committed.transactionId;
    result.state = 'committed';
    saveResult();
    const ids = result.results.filter((record) => record.action !== 'skip-existing').map((record) => record.id);
    const verified = await client.fetch('*[_id in $ids]', { ids });
    if (verified.length !== ids.length) fail('Post-import verification did not return every affected document.');
    for (const item of plan.filter((candidate) => candidate.action === 'update-images')) {
      const actual = verified.find((doc) => doc._id === item.targetId);
      const retained = (doc) => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_updatedAt', 'coverImage', 'hero'].includes(key)));
      if (!isDeepStrictEqual(retained(actual), retained(item.matched))) {
        fail(`${item.document.title}: post-import verification found changes outside coverImage / hero.`);
      }
    }
    for (const actual of verified) {
      walk(actual, (value) => {
        if (value && typeof value === 'object' && 'localAssetKey' in value) fail(`${actual.title}: unresolved localAssetKey after import.`);
      });
    }
    result.verified = verified.map((doc) => ({ _id: doc._id, _rev: doc._rev, title: doc.title, slug: doc.slug?.current, coverAsset: doc.coverImage?.asset?._ref, heroAsset: doc.hero?.[0]?.asset?._ref, sections: doc.sections?.length ?? 0 }));
  }
  result.state = options.apply ? 'verified' : 'dry-run-complete';
  saveResult();
  console.log(`${options.apply ? 'Applied' : 'Dry run complete; no uploads or CMS changes'}: ${options.result}`);
  } catch (error) {
    result.state = result.transactionId ? 'committed-verification-failed' : result.state === 'committing' ? 'commit-not-confirmed' : 'failed';
    result.error = token ? String(error.message).split(token).join('[redacted]') : String(error.message);
    saveResult();
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const token = getToken();
    const message = token ? String(error.message).split(token).join('[redacted]') : String(error.message);
    console.error(`Import failed: ${message}`);
    process.exitCode = 1;
  });
}
