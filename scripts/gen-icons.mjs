import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#06060f"/>
  <circle cx="256" cy="256" r="220" fill="#e50914"/>
  <polygon points="210,170 210,342 370,256" fill="white"/>
</svg>`);

await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
console.log('icon-192.png done');

await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');
console.log('icon-512.png done');
