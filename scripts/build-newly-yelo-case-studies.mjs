#!/usr/bin/env node
/**
 * Expand the compact case-study copy into Sanity documents.
 *
 *   node scripts/build-newly-yelo-case-studies.mjs
 *
 * Reads content/figma-case-studies/case-study-copy/{newly,yelo,elapse,costudy}.json
 * and writes content/figma-case-studies/<slug>-case-study.json, the files
 * that scripts/update-newly-yelo-case-studies.mjs publishes.
 *
 * Compact format (per project):
 *   {
 *     "documentId": "figma-portfolio-yelo",
 *     "fields": {
 *       "description", "client", "discipline", "link", "intro", "summary",
 *       "overview", "impact",
 *       "details": [{"label", "value"}],
 *       "cover": {"asset": "cover", "alt": "..."},
 *       "hero": {"image": "cover", "alt": "..."} | {"video": "clip", "poster": "clip-poster", "caption"},
 *       "sections": [{"title", "heading", "content": [
 *         "a paragraph",
 *         {"h3": "subheading"}, {"quote": "..."}, {"bullets": ["..."]},
 *         {"image": "assetKey", "alt": "...", "caption": "...", "size": "full" | "content"},
 *         {"board": {"label", "prompt", "notes": [{"text", "color", "tag", "highlight"}]}, "caption"},
 *         {"video": "assetKey", "poster": "assetKey", "caption": "...", "autoplay": true},
 *         {"gallery": [{"image": "assetKey", "alt": "..."}], "caption": "..."}
 *       ]}]
 *     },
 *     "assets": {"key": {"path": "assets/file.jpg", "sourceNodeIds": ["1:2"], "note": "..."}}
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'content/figma-case-studies');

function expand(copy, slug) {
  const key = (...parts) => `${slug}-${parts.join('-')}`;
  // **bold** in the copy becomes a span with the strong decorator.
  const spans = (k, text) => text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part, n) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    return { _type: 'span', _key: n === 0 ? `${k}-s` : `${k}-s${n}`, marks: bold ? ['strong'] : [], text: bold ? part.slice(2, -2) : part };
  });
  const block = (k, text, style = 'normal', extra = {}) => ({ _type: 'block', _key: k, style, markDefs: [], children: spans(k, text), ...extra });
  const image = (k, item) => ({ _type: 'mediaImage', _key: k, localAssetKey: item.image, alt: item.alt, ...(item.caption ? { caption: item.caption } : {}), size: item.size ?? 'full' });
  const video = (k, item) => ({
    _type: 'mediaVideo', _key: k, file: { _type: 'file', localAssetKey: item.video },
    ...(item.poster ? { poster: { _type: 'image', localAssetKey: item.poster } } : {}),
    autoplay: item.autoplay ?? true, ...(item.caption ? { caption: item.caption } : {}), size: item.size ?? 'full',
  });
  const NOTE_KEYS = ['text', 'color', 'tag', 'highlight'];
  const checkBoard = (k, item) => {
    if (!Array.isArray(item.board?.notes) || item.board.notes.length === 0) throw new Error(`${slug}: board ${k} needs a notes array.`);
    for (const [i, n] of item.board.notes.entries()) {
      const extra = Object.keys(n ?? {}).filter((key) => !NOTE_KEYS.includes(key));
      if (!n || typeof n.text !== 'string' || extra.length) throw new Error(`${slug}: board ${k} note ${i} needs text and only ${NOTE_KEYS.join(', ')}${extra.length ? ` (found ${extra.join(', ')})` : ''}.`);
    }
    const boardExtra = Object.keys(item.board).filter((key) => !['label', 'prompt', 'notes'].includes(key));
    if (boardExtra.length) throw new Error(`${slug}: board ${k} has unknown fields ${boardExtra.join(', ')} (put caption next to board, not inside it).`);
  };
  const board = (k, item) => (checkBoard(k, item), {
    _type: 'stickyBoard', _key: k,
    ...(item.board.label ? { label: item.board.label } : {}),
    ...(item.board.prompt ? { prompt: item.board.prompt } : {}),
    notes: item.board.notes.map((n, i) => ({
      _type: 'stickyNote', _key: `${k}-n${i}`, text: n.text, color: n.color ?? 'yellow',
      ...(n.tag ? { tag: n.tag } : {}), ...(n.highlight ? { highlight: n.highlight } : {}),
    })),
    ...(item.caption ? { caption: item.caption } : {}),
  });
  const gallery = (k, item) => ({
    _type: 'mediaGallery', _key: k, ...(item.caption ? { caption: item.caption } : {}),
    images: item.gallery.map((g, i) => ({ _type: 'image', _key: `${k}-${i}`, localAssetKey: g.image, alt: g.alt })),
  });

  const f = copy.fields;
  const fields = {
    ...(f.title ? { title: f.title } : {}),
    description: f.description,
    client: f.client,
    discipline: f.discipline,
    ...(f.link ? { link: f.link } : {}),
    intro: f.intro,
    summary: f.summary,
    overview: f.overview,
    ...(f.impact ? { impact: f.impact } : {}),
    showSideMenu: true,
    details: f.details.map((d, i) => ({ _type: 'detailItem', _key: key('detail', i), label: d.label, value: d.value })),
    coverImage: { _type: 'image', localAssetKey: f.cover.asset, alt: f.cover.alt },
    hero: [f.hero.video ? video(key('hero'), f.hero) : { _type: 'mediaImage', _key: key('hero'), localAssetKey: f.hero.image, alt: f.hero.alt, size: 'full' }],
    sections: f.sections.map((s, i) => ({
      _type: 'projectSection',
      _key: key('section', i),
      title: s.title,
      ...(s.heading ? { heading: s.heading } : {}),
      content: s.content.flatMap((item, j) => {
        const k = key('s', i, 'b', j);
        if (typeof item === 'string') return [block(k, item)];
        if (item.h3) return [block(k, item.h3, 'h3')];
        if (item.quote) return [block(k, item.quote, 'blockquote')];
        if (item.bullets) return item.bullets.map((text, n) => block(`${k}-${n}`, text, 'normal', { listItem: 'bullet', level: 1 }));
        if (item.image) return [image(k, item)];
        if (item.video) return [video(k, item)];
        if (item.gallery) return [gallery(k, item)];
        if (item.board) return [board(k, item)];
        throw new Error(`${slug}: unknown content item in section "${s.title}" at index ${j}`);
      }),
    })),
  };
  return { documentId: copy.documentId, generatedFrom: `case-study-copy/${slug}.json`, fields, assets: copy.assets };
}

for (const slug of ['newly', 'yelo', 'elapse', 'costudy']) {
  const source = path.join(folder, 'case-study-copy', `${slug}.json`);
  if (!fs.existsSync(source)) {
    console.log(`${slug}: no ${path.relative(root, source)} yet, skipped.`);
    continue;
  }
  const copy = JSON.parse(fs.readFileSync(source, 'utf8'));
  const doc = expand(copy, slug);
  const out = path.join(folder, `${slug}-case-study.json`);
  fs.writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
  const blocks = doc.fields.sections.flatMap((s) => s.content);
  console.log(`${slug}: ${doc.fields.sections.length} sections, ${blocks.filter((b) => b._type === 'block').length} text blocks, ${blocks.filter((b) => b._type !== 'block').length} media blocks, ${Object.keys(doc.assets).length} assets → ${path.relative(root, out)}`);
}
