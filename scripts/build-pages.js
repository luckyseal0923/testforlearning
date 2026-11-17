import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const source = new URL('../public/', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
const html = await readFile(new URL('index.html', source), 'utf8');
await writeFile(new URL('index.html', output), html
  .replace('data-mode="server"', 'data-mode="static"')
  .replace(/data-version="[^"]*"/, `data-version="${version}"`));
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages 檔案已產生於 dist/');
