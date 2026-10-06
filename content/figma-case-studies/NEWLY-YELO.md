# Newly and Yelo case studies

Two full case studies written from the Figma files, with media composed from
Figma renders. They replace the three-section placeholders on the existing
`figma-portfolio-newly` and `figma-portfolio-yelo` Sanity documents; titles,
slugs, years and home-page order are left alone.

## Files

| Path | What it is |
| --- | --- |
| `case-study-copy/newly.json`, `case-study-copy/yelo.json` | The copy, in a compact format: header fields, sections, and an asset list with Figma node ids. Edit these. |
| `newly-case-study.json`, `yelo-case-study.json` | Generated Sanity documents (Portable Text blocks, `_key`s, `localAssetKey` references). Do not edit by hand. |
| `media-plan-newly.json`, `media-plan-yelo.json` | How each image and clip in `assets/` is composed from Figma node renders (device frames, rows, crops, time-lapse clips). |
| `assets/newly-cs-*`, `assets/yelo-cs-*` | The composed media (JPG and MP4) that gets uploaded. |

Source designs: Newly `qDdxlqtBxVpaAOUMITle4W` (Final Screens and Flows `284:25319`, Playground `284:25318`, prompt bar `284:16034` / `284:16320`); Yelo `ku9ORnV1TNcdc1LIohihFd` (page `0:1`).

## Publish

```sh
node scripts/build-newly-yelo-case-studies.mjs        # copy JSON → Sanity documents
node scripts/update-newly-yelo-case-studies.mjs       # dry run against the live documents
node scripts/update-newly-yelo-case-studies.mjs --apply
```

The update script uploads the assets, patches both documents in one
transaction, saves the previous state to `sanity-before-newly-yelo-update.json`
and verifies the result. It needs a Sanity write token (`SANITY_API_TOKEN`, or
a logged-in Sanity CLI). `--only newly` / `--only yelo` publishes one project;
`--offline` validates the files without network access.

## Preview before publishing

```sh
node scripts/preview-case-studies.mjs                 # stand-in query API on :4545
SANITY_API_HOST=http://127.0.0.1:4545 npm run dev      # in a second terminal
```

Then open `/projects/newly` and `/projects/yelo`. The stand-in serves the local
documents and copies the assets into `public/__preview` (ignored by git), so
the pages render exactly as they will after publishing.

## Re-composing media

The media plans reference Figma nodes as `figma:<nodeId>`. Render the nodes
(2x for 1280×832 desktop screens, 3x for 402×874 phone screens and the prompt
bar component, 1x for the 1583×991 marketing compositions), write a JSON map of
`{ "<nodeId>": { "path": "<png>", "scale": <n> } }`, and run:

```sh
python3 scripts/compose-case-study-media.py content/figma-case-studies/media-plan-yelo.json --source-map exports.json
```

It needs Pillow, and ffmpeg for the time-lapse clips.
