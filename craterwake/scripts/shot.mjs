// The panoramic key art was composed for the arcade shelf.
import { copyFile } from 'node:fs/promises';
await copyFile(
  new URL('../assets/key-art.webp', import.meta.url),
  new URL('../../shots/craterwake.webp', import.meta.url),
);
console.log('Wrote shots/craterwake.webp');
