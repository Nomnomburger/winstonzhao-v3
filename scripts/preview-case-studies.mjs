#!/usr/bin/env node
/**
 * Preview unpublished case studies in the site without touching Sanity.
 *
 *   node scripts/preview-case-studies.mjs            # newly and yelo
 *   node scripts/preview-case-studies.mjs yelo       # one project
 *
 * Reads content/figma-case-studies/<slug>-case-study.json, copies their
 * assets into public/__preview and serves a tiny stand-in for the Sanity
 * query API on port 4545. Then, in another terminal:
 *
 *   SANITY_API_HOST=http://127.0.0.1:4545 npm run dev
 *
 * and open http://localhost:3000/projects/yelo. The stand-in answers the two
 * queries the site makes (project list and one project by slug) with the
 * local documents, so images and videos come from public/__preview.
 * public/__preview is generated and ignored by git.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'content/figma-case-studies');
const publicDir = path.join(root, 'public/__preview');
const port = Number(process.env.PREVIEW_PORT || 4545);

// Only the fields the home page order and the page header need; the rest
// comes from the case study file.
const BASE = {
  newly: { _id: 'figma-portfolio-newly', title: 'Newly', slug: 'newly', year: 2026, order: 5, featured: false },
  yelo: { _id: 'figma-portfolio-yelo', title: 'Yelo', slug: 'yelo', year: 2026, order: 7, featured: false },
};

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BASE);

// Width and height from a PNG or JPEG header (enough for aspect-ratio boxes).
function imageSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return undefined;
    const marker = buf[i + 1];
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return undefined;
}

function load(slug) {
  const file = path.join(folder, `${slug}-case-study.json`);
  if (!BASE[slug] || !fs.existsSync(file)) throw new Error(`No case study file for "${slug}" (${path.relative(root, file)}).`);
  const copy = JSON.parse(fs.readFileSync(file, 'utf8'));
  const assets = {};
  for (const [key, asset] of Object.entries(copy.assets)) {
    const src = path.join(folder, asset.path);
    const name = path.basename(src);
    fs.copyFileSync(src, path.join(publicDir, name));
    const info = { _id: `preview-${slug}-${key}`, url: `/__preview/${name}` };
    const dimensions = /\.(png|jpe?g)$/i.test(name) ? imageSize(src) : undefined;
    if (dimensions) info.metadata = { dimensions };
    assets[key] = info;
  }
  // Swap every localAssetKey for the shape the site's GROQ projection returns.
  const resolve = (value) => {
    if (Array.isArray(value)) return value.map(resolve);
    if (!value || typeof value !== 'object') return value;
    const { localAssetKey, ...rest } = value;
    const out = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, resolve(v)]));
    if (localAssetKey) {
      const info = assets[localAssetKey];
      if (out._type === 'file') return { _type: 'file', asset: info };
      out.asset = info;
    }
    if (out._type === 'mediaVideo' && out.file?.asset?.url) out.fileUrl = out.file.asset.url;
    return out;
  };
  return { ...BASE[slug], _type: 'project', ...resolve(copy.fields) };
}

fs.mkdirSync(publicDir, { recursive: true });
const docs = slugs.map(load);
const summary = ({ _id, title, slug, year, featured, order, description, coverImage }) => ({ _id, title, slug, year, featured, order, description, coverImage });

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const query = url.searchParams.get('query') || '';
  const bySlug = query.includes('slug.current == $slug');
  const result = bySlug ? docs.find((d) => d.slug === JSON.parse(url.searchParams.get('$slug') || '""')) ?? null : docs.map(summary);
  const body = JSON.stringify({ ms: 1, query, result });
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${docs.map((d) => d.slug).join(', ')} at http://127.0.0.1:${port}`);
  console.log(`Now run: SANITY_API_HOST=http://127.0.0.1:${port} npm run dev`);
});
