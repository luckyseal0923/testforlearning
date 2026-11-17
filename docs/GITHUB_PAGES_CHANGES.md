# GitHub Pages 修改前後對照

本文件列出此次修改檔案的完整內容，可直接複製對應程式碼。

## package.json

### 修改前

```json
{
  "name": "deployment-practice",
  "version": "1.0.0",
  "private": true,
  "description": "最小 Node.js 動態網頁，供本機執行與部署練習。",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

### 修改後

```json
{
  "name": "deployment-practice",
  "version": "1.0.0",
  "private": true,
  "description": "最小 Node.js 動態網頁，供本機執行與部署練習。",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build:pages": "node scripts/build-pages.js"
  }
}
```

## .gitignore

### 修改前

```text
node_modules/
.env
.env.*
*.log
```

### 修改後

```text
node_modules/
.env
.env.*
*.log
dist/
```

## public/index.html

### 修改前

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="最小動態網頁：測試伺服器連線、查看時間與點擊互動。">
    <title>部署練習</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="/style.css">
    <script src="/app.js" defer></script>
  </head>
  <body>
    <main class="card">
      <header>
        <span class="eyebrow">HELLO, DEPLOYMENT.</span>
        <span id="status" class="status" role="status">連線中</span>
      </header>
      <h1>小小網頁，<br>開始上線。</h1>
      <p class="intro">一個簡單的動態網頁，陪你完成第一次部署。</p>

      <section class="server-info" aria-label="伺服器狀態">
        <div><span class="label">伺服器時間 · 台灣</span><strong id="server-time">—</strong></div>
        <div><span class="label">已持續運行</span><strong id="uptime">—</strong></div>
      </section>

      <section class="counter" aria-label="點擊計數器">
        <p class="label">試著點一下，確認互動正常</p>
        <p id="count" class="count" aria-live="polite">0</p>
        <div class="actions">
          <button id="increment" type="button">點一下 +1 <span aria-hidden="true">↗</span></button>
          <button id="reset" class="secondary" type="button">歸零</button>
        </div>
        <p class="hint">計數只在目前頁面保留，重新整理會歸零。</p>
      </section>

      <footer><span>NODE.JS · <span id="version">—</span></span><span>伺服器狀態每 5 秒更新</span></footer>
    </main>
  </body>
</html>
```

### 修改後

```html
<!doctype html>
<html lang="zh-Hant" data-mode="server" data-version="1.0.0">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="最小動態網頁：測試伺服器連線、查看時間與點擊互動。">
    <title>部署練習</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="./style.css">
    <script src="./app.js" defer></script>
  </head>
  <body>
    <main class="card">
      <header>
        <span class="eyebrow">HELLO, DEPLOYMENT.</span>
        <span id="status" class="status" role="status">連線中</span>
      </header>
      <h1>小小網頁，<br>開始上線。</h1>
      <p class="intro">一個簡單的動態網頁，陪你完成第一次部署。</p>

      <section class="server-info" aria-label="伺服器狀態">
        <div><span id="time-label" class="label">伺服器時間 · 台灣</span><strong id="server-time">—</strong></div>
        <div><span id="uptime-label" class="label">已持續運行</span><strong id="uptime">—</strong></div>
      </section>

      <section class="counter" aria-label="點擊計數器">
        <p class="label">試著點一下，確認互動正常</p>
        <p id="count" class="count" aria-live="polite">0</p>
        <div class="actions">
          <button id="increment" type="button">點一下 +1 <span aria-hidden="true">↗</span></button>
          <button id="reset" class="secondary" type="button">歸零</button>
        </div>
        <p class="hint">計數只在目前頁面保留，重新整理會歸零。</p>
      </section>

      <footer><span><span id="runtime">NODE.JS</span> · <span id="version">—</span></span><span id="update-note">伺服器狀態每 5 秒更新</span></footer>
    </main>
  </body>
</html>
```

## public/app.js

### 修改前

```javascript
let count = 0;
const countElement = document.querySelector('#count');
const statusElement = document.querySelector('#status');
const timeElement = document.querySelector('#server-time');
const uptimeElement = document.querySelector('#uptime');
const versionElement = document.querySelector('#version');
const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

document.querySelector('#increment').addEventListener('click', () => {
  countElement.textContent = String(++count);
});

document.querySelector('#reset').addEventListener('click', () => {
  count = 0;
  countElement.textContent = '0';
});

async function updateStatus() {
  try {
    const response = await fetch('/api/status', {
      cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    timeElement.textContent = timeFormatter.format(new Date(data.time));
    const minutes = Math.floor(data.uptime / 60);
    uptimeElement.textContent = `${minutes} 分 ${data.uptime % 60} 秒`;
    versionElement.textContent = `v${data.version}`;
    statusElement.textContent = '伺服器已連線';
    statusElement.className = 'status online';
  } catch {
    statusElement.textContent = '連線中斷，重試中';
    statusElement.className = 'status offline';
    timeElement.textContent = '—';
    uptimeElement.textContent = '—';
    versionElement.textContent = '—';
  } finally {
    window.setTimeout(updateStatus, 5000);
  }
}

updateStatus();
```

### 修改後

```javascript
let count = 0;
const countElement = document.querySelector('#count');
const statusElement = document.querySelector('#status');
const timeElement = document.querySelector('#server-time');
const uptimeElement = document.querySelector('#uptime');
const versionElement = document.querySelector('#version');
const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

document.querySelector('#increment').addEventListener('click', () => {
  countElement.textContent = String(++count);
});

document.querySelector('#reset').addEventListener('click', () => {
  count = 0;
  countElement.textContent = '0';
});

async function updateStatus() {
  try {
    const response = await fetch('/api/status', {
      cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    timeElement.textContent = timeFormatter.format(new Date(data.time));
    const minutes = Math.floor(data.uptime / 60);
    uptimeElement.textContent = `${minutes} 分 ${data.uptime % 60} 秒`;
    versionElement.textContent = `v${data.version}`;
    statusElement.textContent = '伺服器已連線';
    statusElement.className = 'status online';
  } catch {
    statusElement.textContent = '連線中斷，重試中';
    statusElement.className = 'status offline';
    timeElement.textContent = '—';
    uptimeElement.textContent = '—';
    versionElement.textContent = '—';
  } finally {
    window.setTimeout(updateStatus, 5000);
  }
}

if (document.documentElement.dataset.mode === 'static') {
  const openedAt = performance.now();
  document.querySelector('#time-label').textContent = '瀏覽器時間 · 台灣';
  document.querySelector('#uptime-label').textContent = '本頁開啟時間';
  document.querySelector('#runtime').textContent = 'GITHUB PAGES';
  document.querySelector('#update-note').textContent = '瀏覽器時間每秒更新';
  versionElement.textContent = `v${document.documentElement.dataset.version}`;
  statusElement.textContent = '網頁已載入';
  statusElement.className = 'status online';

  const updateBrowserTime = () => {
    timeElement.textContent = timeFormatter.format(new Date());
    const seconds = Math.floor((performance.now() - openedAt) / 1000);
    uptimeElement.textContent = `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
  };
  updateBrowserTime();
  window.setInterval(updateBrowserTime, 1000);
} else {
  updateStatus();
}
```

## scripts/build-pages.js（新增）

```javascript
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
```

## .github/workflows/deploy-pages.yml（新增）

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: github-pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '24'
          package-manager-cache: false
      - name: Check JavaScript
        run: |
          node --check server.js
          node --check public/app.js
          node --check scripts/build-pages.js
      - name: Build static website
        run: npm run build:pages
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload website
        uses: actions/upload-pages-artifact@v4
        with:
          path: dist
      - name: Deploy website
        id: deployment
        uses: actions/deploy-pages@v4
```
