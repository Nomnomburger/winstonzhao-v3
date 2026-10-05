import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.resolve('content/figma-case-studies/assets');
const svg = (s) => Buffer.from(s);

// Preserve the exported screen pixels; use a simple device border and backdrop.
async function phone(file, width, height) {
  const pixels = await sharp(path.join(dir, file)).resize(width, height, {fit: 'contain',background:'#fff'}).png().toBuffer();
  const mask = svg(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${width * .105}" fill="white"/></svg>`);
  return sharp(pixels).composite([{input:mask, blend:'dest-in'}]).png().toBuffer();
}

async function phoneComposition(files, output, square = false) {
  const width = square ? 716 : 1600;
  const height = square ? 717 : 1100;
  const screenHeight = square ? 552 : 940;
  const screenWidth = square ? 254 : 432;
  const gap = square ? 0 : 144;
  const firstX = (width - files.length * (screenWidth + 14) - (files.length - 1) * gap) / 2;
  const top = (height - screenHeight - 14) / 2;
  const layers = [];
  for (let i = 0; i < files.length; i++) {
    const x = Math.round(firstX + i * (screenWidth + 14 + gap));
    const y = Math.round(top);
    layers.push({input:svg(`<svg width="${screenWidth+14}" height="${screenHeight+14}"><rect width="${screenWidth+14}" height="${screenHeight+14}" rx="${screenWidth*.13}" fill="#161616" stroke="#8d8d8d" stroke-width="3"/></svg>`),left:x,top:y});
    layers.push({input:await phone(files[i],screenWidth,screenHeight),left:x+7,top:y+7});
  }
  await sharp({create:{width,height,channels:4,background:'#f5f5f5'}}).composite(layers).png().toFile(path.join(dir,output));
}

for (const slug of ['yelo','cocart']) await phoneComposition([`${slug}-screen.png`],`${slug}-cover.png`,true);
const pairs = {
  yelo:['yelo-map','yelo-ride'],costudy:['costudy-home','costudy-threads'],
  cocart:['cocart','cocart-pending'],ryri:['ryri-ready','ryri-focus'],
  smartbasket:['smartbasket-home','smartbasket-list'],villio:['villio-home','villio-booking'],
  munisync:['munisync-home','munisync-booking'],arca:['arca-discover','arca-activity'],
};
for (const [slug,screens] of Object.entries(pairs)) await phoneComposition(screens.map(s=>`${s}-screen.png`),`${slug}-details.png`);

// Augwa's unclipped frame includes content below the viewport; preserve the
// complete export in the case study and use the original viewport for the cover.
const augwa = await sharp(path.join(dir,'augwa-screen.png')).extract({left:0,top:0,width:1008,height:613}).png().toBuffer();
await sharp(augwa).toFile(path.join(dir,'augwa-cover.png'));
for (const slug of ['hack404','summerhacks']) await fs.copyFile(path.join(dir,`${slug}-screen.png`),path.join(dir,`${slug}-cover.png`));
console.log('Prepared 5 covers and 8 screen compositions from Figma exports.');
