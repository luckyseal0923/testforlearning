# Gmail 寄信練習：修改前後對照

沿用原有計數網站，在首頁新增入口，並讓本機服務與 GitHub Pages 都能提供 Gmail 練習頁。以下列出修改程式碼的完整對照，可直接複製對應區塊。

新增檔案的完整程式碼：

- [public/gmail/index.html](../public/gmail/index.html)
- [public/gmail/style.css](../public/gmail/style.css)
- [public/gmail/app.js](../public/gmail/app.js)
- [public/gmail/mail.js](../public/gmail/mail.js)
- [public/gmail/setup.html](../public/gmail/setup.html)
- [public/gmail/privacy.html](../public/gmail/privacy.html)
- [tests/gmail.test.js](../tests/gmail.test.js)

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
    "dev": "node --watch server.js",
    "build:pages": "node scripts/build-pages.js"
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
    "build:pages": "node scripts/build-pages.js",
    "test": "node --test"
  }
}
```

## server.js

### 修改前

```javascript
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 3000);
const version = process.env.APP_VERSION || '1.0.0';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必須是 1 到 65535 之間的整數。');
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'");

  const send = (status, type, body) => {
    response.writeHead(status, { 'Content-Type': type });
    response.end(request.method === 'HEAD' ? undefined : body);
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    send(405, 'text/plain; charset=utf-8', 'Method not allowed');
    return;
  }

  const path = new URL(request.url, 'http://localhost').pathname;

  if (path === '/api/status' || path === '/health') {
    const data = path === '/health'
      ? { status: 'ok' }
      : { version, time: new Date().toISOString(), uptime: Math.floor(process.uptime()) };
    send(200, 'application/json; charset=utf-8', JSON.stringify(data));
    return;
  }

  const file = files.get(path);
  if (!file) {
    send(404, 'text/plain; charset=utf-8', '找不到這個頁面');
    return;
  }

  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    send(200, file[1], content);
  } catch (error) {
    console.error(error);
    send(500, 'text/plain; charset=utf-8', '無法載入網頁');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `連接埠 ${port} 已被其他程式使用，請更換 PORT。` : error.message);
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`部署練習網頁：http://localhost:${port}`);
});
```

### 修改後

```javascript
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 3000);
const version = process.env.APP_VERSION || '1.0.0';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/gmail/', ['gmail/index.html', 'text/html; charset=utf-8']],
  ['/gmail/index.html', ['gmail/index.html', 'text/html; charset=utf-8']],
  ['/gmail/style.css', ['gmail/style.css', 'text/css; charset=utf-8']],
  ['/gmail/app.js', ['gmail/app.js', 'text/javascript; charset=utf-8']],
  ['/gmail/mail.js', ['gmail/mail.js', 'text/javascript; charset=utf-8']],
  ['/gmail/setup.html', ['gmail/setup.html', 'text/html; charset=utf-8']],
  ['/gmail/privacy.html', ['gmail/privacy.html', 'text/html; charset=utf-8']],
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必須是 1 到 65535 之間的整數。');
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', path.startsWith('/gmail/')
    ? "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; connect-src 'self' https://accounts.google.com/gsi/ https://gmail.googleapis.com https://openidconnect.googleapis.com; frame-src https://accounts.google.com/gsi/; style-src 'self' https://accounts.google.com/gsi/style; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    : "default-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  const send = (status, type, body) => {
    response.writeHead(status, { 'Content-Type': type });
    response.end(request.method === 'HEAD' ? undefined : body);
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    send(405, 'text/plain; charset=utf-8', 'Method not allowed');
    return;
  }

  if (path === '/gmail') {
    response.writeHead(302, { Location: '/gmail/' });
    response.end();
    return;
  }

  if (path === '/api/status' || path === '/health') {
    const data = path === '/health'
      ? { status: 'ok' }
      : { version, time: new Date().toISOString(), uptime: Math.floor(process.uptime()) };
    send(200, 'application/json; charset=utf-8', JSON.stringify(data));
    return;
  }

  const file = files.get(path);
  if (!file) {
    send(404, 'text/plain; charset=utf-8', '找不到這個頁面');
    return;
  }

  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    send(200, file[1], content);
  } catch (error) {
    console.error(error);
    send(500, 'text/plain; charset=utf-8', '無法載入網頁');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `連接埠 ${port} 已被其他程式使用，請更換 PORT。` : error.message);
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`部署練習網頁：http://localhost:${port}`);
});
```

## public/index.html

### 修改前

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

      <a class="gmail-entry" href="./gmail/">練習 02：連接 Gmail，寄出第一封信 <span aria-hidden="true">→</span></a>
      <footer><span><span id="runtime">NODE.JS</span> · <span id="version">—</span></span><span id="update-note">伺服器狀態每 5 秒更新</span></footer>
    </main>
  </body>
</html>
```

## public/style.css

### 修改前

```css
:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif;
  color: #202b27;
  background: #f3f5ef;
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; padding: 32px 20px; }
.card { width: min(100%, 540px); padding: 36px; background: #fff; border: 1px solid #e2e7dd; border-radius: 24px; box-shadow: 0 16px 60px #263a2310; }
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.eyebrow { font: 600 11px/1.5 ui-monospace, monospace; letter-spacing: 1.5px; color: #6a786d; }
.status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #626c67; background: #f1f3f1; border-radius: 20px; padding: 6px 10px; white-space: nowrap; }
.status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status.online { color: #286341; background: #edf6ea; }
.status.offline { color: #9c422d; background: #fff0ea; }
h1 { font-size: clamp(32px, 7vw, 44px); line-height: 1.3; letter-spacing: -1.5px; margin: 30px 0 14px; font-weight: 700; }
.intro { color: #647068; font-size: 14px; line-height: 1.8; margin: 0 0 28px; }
.server-info { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; border-block: 1px solid #e8ece5; padding: 20px 0; }
.label { display: block; color: #68746c; font-size: 12px; line-height: 1.6; margin: 0; }
strong { display: block; margin-top: 7px; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.counter { text-align: center; padding: 28px 0 22px; }
.count { margin: 7px 0 19px; font-size: 72px; font-weight: 600; line-height: 1.2; letter-spacing: -3px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.actions { display: flex; justify-content: center; gap: 10px; }
button { min-height: 46px; padding: 0 25px; border: 1px solid transparent; border-radius: 12px; background: #254b38; color: white; font: inherit; font-size: 14px; cursor: pointer; transition: background 120ms, transform 120ms; }
button:hover { background: #193b29; }
button:active { transform: translateY(1px); }
button:focus-visible { outline: 3px solid #81aa86; outline-offset: 3px; }
button span { margin-left: 18px; color: #c2dbb1; }
button.secondary { background: #fff; border-color: #dce3d8; color: #536259; padding-inline: 20px; }
button.secondary:hover { background: #f3f5ef; }
.hint { font-size: 11px; color: #717d74; margin: 15px 0 0; line-height: 1.7; }
footer { border-top: 1px solid #e8ece5; padding-top: 18px; font-size: 10px; color: #748076; }
footer > span:first-child { font-family: ui-monospace, monospace; letter-spacing: .6px; }
@media (max-width: 420px) {
  body { padding: 16px; }
  .card { padding: 25px 22px; border-radius: 20px; }
  header { flex-wrap: wrap; }
  .server-info { grid-template-columns: 1fr; gap: 14px; }
  footer { flex-wrap: wrap; }
}
```

### 修改後

```css
:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif;
  color: #202b27;
  background: #f3f5ef;
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; padding: 32px 20px; }
.card { width: min(100%, 540px); padding: 36px; background: #fff; border: 1px solid #e2e7dd; border-radius: 24px; box-shadow: 0 16px 60px #263a2310; }
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.eyebrow { font: 600 11px/1.5 ui-monospace, monospace; letter-spacing: 1.5px; color: #6a786d; }
.status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #626c67; background: #f1f3f1; border-radius: 20px; padding: 6px 10px; white-space: nowrap; }
.status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status.online { color: #286341; background: #edf6ea; }
.status.offline { color: #9c422d; background: #fff0ea; }
h1 { font-size: clamp(32px, 7vw, 44px); line-height: 1.3; letter-spacing: -1.5px; margin: 30px 0 14px; font-weight: 700; }
.intro { color: #647068; font-size: 14px; line-height: 1.8; margin: 0 0 28px; }
.server-info { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; border-block: 1px solid #e8ece5; padding: 20px 0; }
.label { display: block; color: #68746c; font-size: 12px; line-height: 1.6; margin: 0; }
strong { display: block; margin-top: 7px; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.counter { text-align: center; padding: 28px 0 22px; }
.count { margin: 7px 0 19px; font-size: 72px; font-weight: 600; line-height: 1.2; letter-spacing: -3px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.actions { display: flex; justify-content: center; gap: 10px; }
button { min-height: 46px; padding: 0 25px; border: 1px solid transparent; border-radius: 12px; background: #254b38; color: white; font: inherit; font-size: 14px; cursor: pointer; transition: background 120ms, transform 120ms; }
button:hover { background: #193b29; }
button:active { transform: translateY(1px); }
button:focus-visible { outline: 3px solid #81aa86; outline-offset: 3px; }
button span { margin-left: 18px; color: #c2dbb1; }
button.secondary { background: #fff; border-color: #dce3d8; color: #536259; padding-inline: 20px; }
button.secondary:hover { background: #f3f5ef; }
.hint { font-size: 11px; color: #717d74; margin: 15px 0 0; line-height: 1.7; }
.gmail-entry { display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid #e8ece5; padding: 17px 0; color: #28533b; font-size: 12px; line-height: 1.8; text-decoration: none; }
.gmail-entry:hover { text-decoration: underline; }
.gmail-entry:focus-visible { outline: 3px solid #81aa86; outline-offset: 3px; }
footer { border-top: 1px solid #e8ece5; padding-top: 18px; font-size: 10px; color: #748076; }
footer > span:first-child { font-family: ui-monospace, monospace; letter-spacing: .6px; }
@media (max-width: 420px) {
  body { padding: 16px; }
  .card { padding: 25px 22px; border-radius: 20px; }
  header { flex-wrap: wrap; }
  .server-info { grid-template-columns: 1fr; gap: 14px; }
  footer { flex-wrap: wrap; }
}
```

## .github/workflows/deploy-pages.yml

### 修改前

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

### 修改後

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
          node --check public/gmail/app.js
          node --check public/gmail/mail.js
          node --check scripts/build-pages.js
      - name: Test Gmail message and consent handling
        run: npm test
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
