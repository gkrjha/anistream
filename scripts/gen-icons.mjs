import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Black background -->
  <circle cx="256" cy="256" r="256" fill="#0a0a0a"/>

  <!-- Outer red ring -->
  <circle cx="256" cy="256" r="220" fill="#e50914"/>
  <circle cx="256" cy="256" r="175" fill="#0a0a0a"/>

  <!-- Blade 1 (top) -->
  <path d="M256,81 C290,81 330,120 330,175 C330,205 315,228 295,240 C275,252 256,252 256,252 C256,252 237,252 217,240 C197,228 182,205 182,175 C182,120 222,81 256,81Z" fill="#e50914"/>

  <!-- Blade 2 (bottom-right) -->
  <path d="M256,81 C290,81 330,120 330,175 C330,205 315,228 295,240 C275,252 256,252 256,252 C256,252 237,252 217,240 C197,228 182,205 182,175 C182,120 222,81 256,81Z" fill="#e50914" transform="rotate(120,256,256)"/>

  <!-- Blade 3 (bottom-left) -->
  <path d="M256,81 C290,81 330,120 330,175 C330,205 315,228 295,240 C275,252 256,252 256,252 C256,252 237,252 217,240 C197,228 182,205 182,175 C182,120 222,81 256,81Z" fill="#e50914" transform="rotate(240,256,256)"/>

  <!-- Inner black circle -->
  <circle cx="256" cy="256" r="90" fill="#0a0a0a"/>

  <!-- Center red pupil -->
  <circle cx="256" cy="256" r="45" fill="#e50914"/>

  <!-- Tiny black center dot -->
  <circle cx="256" cy="256" r="18" fill="#0a0a0a"/>
</svg>`);

await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
console.log('icon-192.png done');

await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');
console.log('icon-512.png done');

// Also generate favicon.ico equivalent as 32x32 png for browser tab
await sharp(svg).resize(32, 32).png().toFile('public/favicon-32.png');
console.log('favicon-32.png done');
