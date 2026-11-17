# LINE 通知練習：完整修改對照

新增檔案的完整原始碼位於 public/line/、supabase/ 與 tests/line*.test.js。這份文件列出既有檔案修改前後全文，可直接比對與複製。私密環境變數的實際值不列入文件。

## .gitignore

### 修改前

```text
node_modules/
.env
.env.*
*.log
dist/

```

### 修改後

```text
node_modules/
.env
.env.*
*.log
dist/
client_secret_*.json
supabase/.temp/
supabase/.branches/

```

## package.json

### 修改前

```text
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

### 修改後

```text
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
  },
  "devDependencies": {
    "@electric-sql/pglite": "^0.5.16"
  }
}

```

## .github/workflows/deploy-pages.yml

### 修改前

```text
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

### 修改後

```text
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
      - name: Install test dependencies
        run: npm ci
      - name: Check JavaScript
        run: |
          node --check server.js
          node --check public/app.js
          node --check public/gmail/app.js
          node --check public/gmail/mail.js
          node --check public/line/app.js
          node --check public/line/client.js
          node --check supabase/functions/line-practice/core.mjs
          node --check scripts/build-pages.js
      - name: Test Gmail and LINE handling
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

## server.js

### 修改前

```text
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

### 修改後

```text
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
  ['/line/', ['line/index.html', 'text/html; charset=utf-8']],
  ['/line/index.html', ['line/index.html', 'text/html; charset=utf-8']],
  ['/line/style.css', ['line/style.css', 'text/css; charset=utf-8']],
  ['/line/app.js', ['line/app.js', 'text/javascript; charset=utf-8']],
  ['/line/client.js', ['line/client.js', 'text/javascript; charset=utf-8']],
  ['/line/setup.html', ['line/setup.html', 'text/html; charset=utf-8']],
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必須是 1 到 65535 之間的整數。');
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', path.startsWith('/line/')
    ? "default-src 'self'; connect-src 'self' https://*.supabase.co; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    : path.startsWith('/gmail/')
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

  if (path === '/gmail' || path === '/line') {
    response.writeHead(302, { Location: `${path}/` });
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

```text
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

### 修改後

```text
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
      <a class="gmail-entry" href="./line/">練習 03：Supabase × LINE 通知 <span aria-hidden="true">→</span></a>
      <footer><span><span id="runtime">NODE.JS</span> · <span id="version">—</span></span><span id="update-note">伺服器狀態每 5 秒更新</span></footer>
    </main>
  </body>
</html>

```

## README.md

### 修改前

```text
# 最小動態網頁：部署練習

一個不需額外套件的 Node.js 專案。網頁會向後端取得伺服器時間、運行時間和版本，也能點擊計數或歸零。沒有資料庫；計數只存在目前頁面，重新整理就會歸零。

同一份專案也提供 GitHub Pages 版本：保留按鈕互動，改顯示瀏覽器時間與本頁開啟時間。GitHub Pages 不執行 Node.js 後端，線上版不會呼叫 `/api/status`。

## GitHub Pages 自動部署

- 網站：<https://luckyseal0923.github.io/testforlearning/>
- 程式碼：<https://github.com/luckyseal0923/testforlearning>
- 部署紀錄：<https://github.com/luckyseal0923/testforlearning/actions>

每次推送到 `main`，GitHub Actions 就會檢查 JavaScript、產生 `dist/`，再把網頁部署到 GitHub Pages。也能在 Actions → Deploy GitHub Pages → Run workflow 手動部署。

本機產生相同的部署檔案：

```powershell
npm run build:pages
```

要練習更新網站，可修改 `public/index.html` 的標題，提交並推送至 `main`，等待 Actions 成功後重新整理網站。部署內容僅包含 `dist/` 中的網頁檔案。

| 執行方式 | 時間來源 | 狀態顯示 | 後端 API |
| --- | --- | --- | --- |
| GitHub Pages | 瀏覽器 | 網頁已載入 | 無 |
| 本機 Node.js／Docker | 伺服器 | 伺服器已連線 | 有 |

## Gmail 寄信練習

- 線上練習頁：<https://luckyseal0923.github.io/testforlearning/gmail/>
- 第一次使用：[Google OAuth 設定指南](public/gmail/setup.html)
- 資料處理說明：[隱私說明](public/gmail/privacy.html)

此頁使用 Google Identity Services 的瀏覽器授權流程及 Gmail API。需要在自己的 Google Cloud 專案啟用 Gmail API，設定 OAuth consent、測試使用者及 Web application Client ID，再把公開的 Client ID 貼到網頁設定區。**不需要 Client Secret、API Key 或 Gmail 密碼。**

僅要求 `gmail.send` 及 `userinfo.email`。權杖只留在目前頁面記憶體；信件先預覽，明確按「確認寄出」才呼叫 Gmail API。未授權、權杖到期及重複點擊會被阻擋；結果不明時不會自動重送。這個範例沒有背景寄信或排程功能。

GitHub Pages 仍是靜態前端，Google 提供授權及真正寄信的後端。此頁使用自己的 Google OAuth Client ID，與 Codex／ChatGPT 中連線的 Gmail 外掛分開。

本機啟動後開啟 <http://localhost:3000/gmail/>。使用其他連接埠時，請將實際 origin 加入 Google 的 Authorized JavaScript origins。

驗證程式：`npm test`。測試使用模擬 API，不會真正寄信；真實授權與寄送需由使用者完成 Google 設定並實際操作確認。

## 1. 本機啟動

需安裝 Node.js 20 以上版本。在專案資料夾開啟終端機，執行：

```powershell
npm start
```

用瀏覽器開啟 <http://localhost:3000>。看到「伺服器已連線」、時間持續更新，而且按鈕能增加數字，就表示前端與後端都正常。

此專案不需要執行 `npm install`，也不需要建置。停止伺服器請在終端機按 `Ctrl+C`。

## 2. 練習調整部署設定

`PORT` 是網頁服務使用的連接埠，預設為 `3000`；`APP_VERSION` 是網頁顯示的版本。以下指令適用 Windows PowerShell：

```powershell
$env:PORT = "8080"
$env:APP_VERSION = "1.0.1"
npm start
```

此時開啟 <http://localhost:8080>。服務會監聽 `0.0.0.0`，可接受主機或容器外部的連線，實際可否連入仍取決於連接埠映射與防火牆設定。

## 3. 練習 Docker 部署

先安裝並啟動 Docker，在本專案資料夾執行：

```powershell
docker build -t deployment-practice .
docker run --rm -d --name deployment-practice -p 8080:3000 -e APP_VERSION=1.0.0 deployment-practice
```

開啟 <http://localhost:8080>。`8080:3000` 表示「主機的 8080 連到容器的 3000」。

查看紀錄與停止容器：

```powershell
docker logs deployment-practice
docker stop deployment-practice
```

## 4. 部署平台設定

如果平台支援 Node.js：

- 啟動指令：`npm start`
- 建置指令：不需要
- 連接埠：使用平台提供的 `PORT`，或設定為 `3000`
- 健康檢查路徑：`/health`

如果平台支援 Docker，選擇根目錄的 `Dockerfile` 即可。

本機／Docker 後端版本需要能執行 Node.js 的服務；GitHub Pages 則部署上述前端版本，無法提供 `/api/status`。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `server.js` | 網頁服務與 `/api/status`、`/health` API |
| `public/index.html` | 網頁內容 |
| `public/style.css` | 外觀與手機排版 |
| `public/app.js` | 按鈕互動及取得伺服器狀態 |
| `Dockerfile` | 將專案包成可部署的容器 |

## 驗證部署

1. 打開首頁，確認顯示「伺服器已連線」。
2. 點擊「點一下 +1」與「歸零」，確認互動正常。
3. 等約 5 秒，確認伺服器時間更新。
4. 開啟 `/health`，應得到 `{"status":"ok"}`。
5. 修改 `APP_VERSION` 並重新啟動／部署，確認頁尾版本跟著改變。

```

### 修改後

```text
# 最小動態網頁：部署練習

一個不需額外套件的 Node.js 專案。網頁會向後端取得伺服器時間、運行時間和版本，也能點擊計數或歸零。沒有資料庫；計數只存在目前頁面，重新整理就會歸零。

同一份專案也提供 GitHub Pages 版本：保留按鈕互動，改顯示瀏覽器時間與本頁開啟時間。GitHub Pages 不執行 Node.js 後端，線上版不會呼叫 `/api/status`。

## GitHub Pages 自動部署

- 網站：<https://luckyseal0923.github.io/testforlearning/>
- 程式碼：<https://github.com/luckyseal0923/testforlearning>
- 部署紀錄：<https://github.com/luckyseal0923/testforlearning/actions>

每次推送到 `main`，GitHub Actions 就會檢查 JavaScript、產生 `dist/`，再把網頁部署到 GitHub Pages。也能在 Actions → Deploy GitHub Pages → Run workflow 手動部署。

本機產生相同的部署檔案：

```powershell
npm run build:pages
```

要練習更新網站，可修改 `public/index.html` 的標題，提交並推送至 `main`，等待 Actions 成功後重新整理網站。部署內容僅包含 `dist/` 中的網頁檔案。

| 執行方式 | 時間來源 | 狀態顯示 | 後端 API |
| --- | --- | --- | --- |
| GitHub Pages | 瀏覽器 | 網頁已載入 | 無 |
| 本機 Node.js／Docker | 伺服器 | 伺服器已連線 | 有 |

## Gmail 寄信練習

- 線上練習頁：<https://luckyseal0923.github.io/testforlearning/gmail/>
- 第一次使用：[Google OAuth 設定指南](public/gmail/setup.html)
- 資料處理說明：[隱私說明](public/gmail/privacy.html)

此頁使用 Google Identity Services 的瀏覽器授權流程及 Gmail API。需要在自己的 Google Cloud 專案啟用 Gmail API，設定 OAuth consent、測試使用者及 Web application Client ID，再把公開的 Client ID 貼到網頁設定區。**不需要 Client Secret、API Key 或 Gmail 密碼。**

僅要求 `gmail.send` 及 `userinfo.email`。權杖只留在目前頁面記憶體；信件先預覽，明確按「確認寄出」才呼叫 Gmail API。未授權、權杖到期及重複點擊會被阻擋；結果不明時不會自動重送。這個範例沒有背景寄信或排程功能。

GitHub Pages 仍是靜態前端，Google 提供授權及真正寄信的後端。此頁使用自己的 Google OAuth Client ID，與 Codex／ChatGPT 中連線的 Gmail 外掛分開。

本機啟動後開啟 <http://localhost:3000/gmail/>。使用其他連接埠時，請將實際 origin 加入 Google 的 Authorized JavaScript origins。

驗證程式：`npm test`。測試使用模擬 API，不會真正寄信；真實授權與寄送需由使用者完成 Google 設定並實際操作確認。

## LINE 通知練習

- 前台：<https://luckyseal0923.github.io/testforlearning/line/>
- 設定指南：[LINE × Supabase 設定](public/line/setup.html)
- 本機：<http://localhost:3000/line/>
- 後端：`supabase/functions/line-practice/index.ts` 與 `core.mjs`
- 資料表：`supabase/migrations/202611170001_line_practice.sql`

使用獨立的 Supabase 練習專案與 LINE Bot。管理者使用 `APP_ADMIN_KEY` 連接管理頁，產生 10 分鐘有效、只用一次的綁定碼，讓對方私訊 Bot 或在群組送出綁定指令。後端檢查 LINE 原始內容的 HMAC 簽章後，將收件對象記入資料庫。網頁選擇收件人、預覽並按「確認發送」才呼叫 LINE Push API。

這是單一管理者的練習範例，管理金鑰可管理這個專案的全部收件對象。所有資料表啟用 RLS，沒有匿名或一般登入使用者的資料權限。公開前台只會收到收件名稱與內部流水號；LINE user/group ID 與兩項 LINE 密鑰留在後端。一般聊天不儲存、不自動回覆，封鎖或離群事件會停用對象。

`supabase/config.toml` 只對 `line-practice` 停用平台 JWT 預檢，讓 LINE 能送入事件；函式自行檢查 Webhook 簽章與管理金鑰，沒有無驗證的通知入口。相同發送請求的重試沿用 LINE Retry Key，不會自動重送；請求被接受不代表一定送達或已讀。

Secrets：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`APP_ADMIN_KEY`、`APP_ALLOWED_ORIGINS`。`.env.local` 與 Google OAuth JSON 均排除版本控制；GitHub Pages 只上傳 `public/` 產生的靜態檔案。

首次執行測試先 `npm ci`，再 `npm test`。新增測試包含隔離的 PostgreSQL（PGlite）權限與一次性綁定整合測試，以及模擬 LINE API 的後端與前端測試；不發送真實訊息。

## 1. 本機啟動

需安裝 Node.js 20 以上版本。在專案資料夾開啟終端機，執行：

```powershell
npm start
```

用瀏覽器開啟 <http://localhost:3000>。看到「伺服器已連線」、時間持續更新，而且按鈕能增加數字，就表示前端與後端都正常。

此專案不需要執行 `npm install`，也不需要建置。停止伺服器請在終端機按 `Ctrl+C`。

## 2. 練習調整部署設定

`PORT` 是網頁服務使用的連接埠，預設為 `3000`；`APP_VERSION` 是網頁顯示的版本。以下指令適用 Windows PowerShell：

```powershell
$env:PORT = "8080"
$env:APP_VERSION = "1.0.1"
npm start
```

此時開啟 <http://localhost:8080>。服務會監聽 `0.0.0.0`，可接受主機或容器外部的連線，實際可否連入仍取決於連接埠映射與防火牆設定。

## 3. 練習 Docker 部署

先安裝並啟動 Docker，在本專案資料夾執行：

```powershell
docker build -t deployment-practice .
docker run --rm -d --name deployment-practice -p 8080:3000 -e APP_VERSION=1.0.0 deployment-practice
```

開啟 <http://localhost:8080>。`8080:3000` 表示「主機的 8080 連到容器的 3000」。

查看紀錄與停止容器：

```powershell
docker logs deployment-practice
docker stop deployment-practice
```

## 4. 部署平台設定

如果平台支援 Node.js：

- 啟動指令：`npm start`
- 建置指令：不需要
- 連接埠：使用平台提供的 `PORT`，或設定為 `3000`
- 健康檢查路徑：`/health`

如果平台支援 Docker，選擇根目錄的 `Dockerfile` 即可。

本機／Docker 後端版本需要能執行 Node.js 的服務；GitHub Pages 則部署上述前端版本，無法提供 `/api/status`。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `server.js` | 網頁服務與 `/api/status`、`/health` API |
| `public/index.html` | 網頁內容 |
| `public/style.css` | 外觀與手機排版 |
| `public/app.js` | 按鈕互動及取得伺服器狀態 |
| `Dockerfile` | 將專案包成可部署的容器 |

## 驗證部署

1. 打開首頁，確認顯示「伺服器已連線」。
2. 點擊「點一下 +1」與「歸零」，確認互動正常。
3. 等約 5 秒，確認伺服器時間更新。
4. 開啟 `/health`，應得到 `{"status":"ok"}`。
5. 修改 `APP_VERSION` 並重新啟動／部署，確認頁尾版本跟著改變。

```
