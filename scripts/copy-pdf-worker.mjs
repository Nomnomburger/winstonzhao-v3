// Copies the pdf.js worker that matches the installed react-pdf/pdfjs-dist
// version into public/, where the resume viewer loads it from. Runs on
// postinstall so the worker never drifts out of sync with the library.
import { createRequire } from 'node:module';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const reactPdfDir = path.dirname(require.resolve('react-pdf/package.json'));
const requireFromReactPdf = createRequire(path.join(reactPdfDir, 'package.json'));
const workerPath = requireFromReactPdf.resolve('pdfjs-dist/build/pdf.worker.min.mjs');

const destination = fileURLToPath(new URL('../public/pdf.worker.min.mjs', import.meta.url));
copyFileSync(workerPath, destination);
console.log(`Copied pdf.js worker to ${destination}`);
