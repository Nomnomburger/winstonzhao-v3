# Case studies: Newly, Yelo, Elapse and CoStudy

Decision-led case studies written from Winston's own answers, with media
rendered from Figma. Each one patches an existing Sanity document; slugs,
years, home-page order and "featured" are left alone. Titles only change where
a copy file sets `fields.title`: Newly becomes "Newly Desktop App" and Elapse
becomes "Elapse App" (its page address stays `/projects/elapse-app-design`).
The dry run shows each title as old → new before you apply.

| Project | Sanity document | Copy |
| --- | --- | --- |
| Newly | `figma-portfolio-newly` | `case-study-copy/newly.json` |
| Yelo | `figma-portfolio-yelo` | `case-study-copy/yelo.json` |
| Elapse | `legacy-portfolio-elapsedesign` | `case-study-copy/elapse.json` |
| CoStudy | `figma-portfolio-costudy` | `case-study-copy/costudy.json` |

## Files

- `case-study-copy/<slug>.json`: the copy (edit these). Content items are
  paragraphs, `{"h3"}`, `{"bullets": [...]}`, `{"image"}`, `{"gallery"}`;
  `**text**` becomes bold. `source.facts` records what Winston confirmed.
- `<slug>-case-study.json`: generated Sanity documents. Don't edit by hand.
- `assets/`: images. `newly-cs2-*` are borderless desktop windows;
  `*-cs3-*` are phone screens in Apple's iPhone 16 Pro (White Titanium)
  product bezel. `*-live.jpg` are downscaled copies of the heroes and
  thumbnails already in Sanity, used only for the local preview.
- An asset with `existingAssetId` points at an image that is already in
  Sanity (Winston's own heroes and thumbnails), so it is referenced, not
  re-uploaded.
- `media-plan-newly-v2.json`, `media-plan-phones-v3.json`: how the images
  were rendered from Figma exports.
- Newly's chat experiments image and the three onboarding clips
  (`newly-cs2-onboarding-*.mp4`, with posters) come from Winston's Claude
  Design canvases ("Chat screen design experiments" and "Newly App
  Onboarding Flow", linked as `sourceUrl` in `newly.json`). The clips were
  recorded frame by frame at 30 fps from the prototype, with its variant
  switcher hidden and a cursor drawn in.
- Elapse uses sample-data copies of seven screens, in the Figma section
  "Portfolio copies (sample data)" (node 307:8347) on the Elapse page; the
  original frames are unchanged.

## Publish (from your own machine)

You need a Sanity token with Editor access (sanity.io/manage → project →
API → Tokens), or a logged-in Sanity CLI.

```sh
git checkout f26-updates && git pull
npm install
node scripts/build-newly-yelo-case-studies.mjs
export SANITY_API_TOKEN=<your editor token>
node scripts/update-newly-yelo-case-studies.mjs --only newly            # dry run
node scripts/update-newly-yelo-case-studies.mjs --only newly --apply
```

Repeat with `--only yelo`, `--only elapse` and `--only costudy`. The script
uploads new images, patches the document in one transaction, saves the
previous state to `sanity-before-<slug>-update.json` (so it can be
reverted) and verifies the result. `--offline` validates without network.

The ideation boards use a new "Sticky notes" block. The site shows them as
soon as the content is published, but to see and edit them in Sanity
Studio, deploy the Studio once with the new schema:

```sh
cd studio && npm install && npm run deploy
```

## Preview before publishing

```sh
node scripts/preview-case-studies.mjs                  # stand-in query API on :4545
SANITY_API_HOST=http://127.0.0.1:4545 npm run dev       # in a second terminal
```

Then open `/projects/newly`, `/projects/yelo`, `/projects/elapse-app-design`
and `/projects/costudy`. After editing a copy file, rerun the build script,
restart the stand-in, and reload (the site caches content for 60 seconds).
