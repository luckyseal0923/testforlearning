# LINE 收件登記簡化：修改前後完整對照

新流程：對 Bot 傳「我要收通知」→ 待確認名單 → 管理者加入收件人 → 預覽確認發送。新資料表遷移見 supabase/migrations/202611180001_line_subscription.sql。

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

使用獨立的 Supabase 練習專案與 LINE Bot。對方私訊 Bot「我要收通知」，或在有 Bot 的群組傳這句話，後端檢查 LINE 原始內容的 HMAC 簽章後取得名稱及識別碼，列入待確認名單。管理頁每 5 秒自動更新，管理者點「加入收件人」後才能選擇該對象；預覽並按「確認發送」才呼叫 LINE Push API。無須綁定碼或手動取收件名稱。

這是單一管理者的練習範例，管理金鑰可管理這個專案的全部收件對象。所有資料表啟用 RLS，沒有匿名或一般登入使用者的資料權限。公開前台只會收到收件名稱、類型、核可狀態與內部流水號；LINE user/group ID 與兩項 LINE 密鑰留在後端。一般聊天不儲存，本後端不自動回覆；LINE 官方帳號自己的自動回應依後台設定。封鎖或離群事件會停用對象，重新訂閱需再次核可；延遲送達的舊事件不會覆蓋新狀態。

全新部署依序執行兩份 SQL：`202611170001_line_practice.sql`、`202611180001_line_subscription.sql`；舊版升級只執行第二份。升級會保留既有收件人及核可資格。舊版綁定碼資料表與函式保留作為歷史相容，但網頁及 `/pair` 入口已停用。

`supabase/config.toml` 只對 `line-practice` 停用平台 JWT 預檢，讓 LINE 能送入事件；函式自行檢查 Webhook 簽章與管理金鑰，沒有無驗證的通知入口。相同發送請求的重試沿用 LINE Retry Key，不會自動重送；請求被接受不代表一定送達或已讀。

Secrets：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`APP_ADMIN_KEY`、`APP_ALLOWED_ORIGINS`。`.env.local` 與 Google OAuth JSON 均排除版本控制；GitHub Pages 只上傳 `public/` 產生的靜態檔案。

首次執行測試先 `npm ci`，再 `npm test`。測試包含隔離的 PostgreSQL（PGlite）權限、舊資料升級、訂閱核可、重複及延遲事件整合測試，以及模擬 LINE API 的後端與前端測試；不發送真實訊息。

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

## public/line/index.html

### 修改前

```text
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="用 Supabase 接收 LINE Webhook，綁定收件人並發送一則通知。">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src https://*.supabase.co; base-uri 'none'; form-action 'none'">
  <title>LINE 通知練習</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="./style.css">
  <script type="module" src="./app.js"></script>
</head>
<body>
  <main class="shell">
    <nav><a href="../">← 部署練習</a><a href="./setup.html">第一次設定指南 ↗</a></nav>
    <header class="hero"><div><span class="eyebrow">PRACTICE 03 · SUPABASE × LINE</span><h1>讓通知，<br>抵達 LINE。</h1><p>連上後端，登記一位收件人，送出第一則訊息。</p></div><span class="badge" id="connection-status" role="status">尚未連線</span></header>
    <section class="panel connection" aria-labelledby="connect-title">
      <div class="section-head"><span class="step">01</span><div><h2 id="connect-title">連接練習專案</h2><p>填入 Supabase 網址與你設定的管理金鑰。</p></div></div>
      <form id="connect-form">
        <div class="connection-fields"><label>Supabase Project URL<input id="project-url" type="url" placeholder="https://你的專案代號.supabase.co" required autocomplete="off"></label><label>管理金鑰<input id="admin-key" type="password" placeholder="APP_ADMIN_KEY，至少 32 字元" required minlength="32" autocomplete="off" spellcheck="false"></label></div>
        <div class="row"><button id="connect-button">連接後端 <span aria-hidden="true">↗</span></button><button id="disconnect" class="secondary" type="button" hidden>中斷連線</button><span class="hint">金鑰只留在目前頁面，重新整理後需重新輸入。</span></div>
      </form>
      <div id="webhook-box" class="webhook" hidden><span class="label">填入 LINE Developers 的 Webhook URL</span><div class="copy-row"><code id="webhook-url"></code><button id="copy-webhook" type="button" class="secondary small">複製網址</button></div></div>
    </section>
    <div class="workspace">
      <section class="panel" aria-labelledby="pair-title">
        <div class="section-head"><span class="step">02</span><div><h2 id="pair-title">登記收件對象</h2><p>讓對方傳送綁定碼，取得可通知的身分。</p></div></div>
        <form id="pair-form"><fieldset id="pair-fields" disabled>
          <label>收件名稱<input id="target-label" placeholder="例如：我的測試 LINE" maxlength="40" required></label>
          <label>對象類型<select id="target-kind"><option value="user">個人</option><option value="group">群組</option></select></label>
          <button id="pair-button">產生一次性綁定碼</button>
        </fieldset></form>
        <div id="pair-result" class="pair-result" hidden><span class="label">請對方把這整行傳給 LINE Bot</span><code id="pair-command"></code><div class="row"><button id="copy-command" class="secondary small" type="button">複製綁定指令</button><span id="pair-expiry" class="hint"></span></div><p class="hint">個人：私訊 Bot。群組：先邀請 Bot 入群，再把指令傳在群組裡。綁定碼只能使用一次。</p></div>
      </section>
      <section class="panel" aria-labelledby="send-title">
        <div class="section-head"><span class="step">03</span><div><h2 id="send-title">送出第一則通知</h2><p>先檢查對象與內容，確認後才會發送。</p></div></div>
        <form id="send-form"><fieldset id="send-fields" disabled>
          <div class="field-heading"><label for="recipient">收件對象</label><button id="refresh-targets" class="text-button" type="button">重新整理名單 ↻</button></div>
          <select id="recipient" required><option value="">還沒有綁定的收件對象</option></select>
          <p id="recipient-count" class="hint">完成綁定後，重新整理名單。</p>
          <label>訊息內容<textarea id="message" rows="4" maxlength="1000" required>這是一則來自 LINE 通知練習頁的測試訊息。</textarea></label>
          <div class="row"><button id="preview-button">預覽通知 <span aria-hidden="true">→</span></button><span id="character-count" class="hint"></span></div>
        </fieldset></form>
      </section>
    </div>
    <p id="feedback" class="feedback" role="status" aria-live="polite">第一次使用，先依設定指南部署 Supabase 後端。</p>
    <footer><span>前台 · GitHub Pages</span><span>後端 · Supabase Edge Functions</span><span>每則通知需手動確認</span></footer>
  </main>
  <dialog id="preview-dialog" aria-labelledby="preview-title"><div class="dialog-content"><span class="eyebrow">READY TO SEND</span><h2 id="preview-title">確認這則通知</h2><p class="label">收件對象</p><strong id="preview-recipient"></strong><p class="label">通知內容</p><p id="preview-message" class="message-preview"></p><p class="hint">按下確認後，會真正呼叫 LINE 傳送訊息。</p><p id="send-error" role="alert"></p><div class="row"><button id="confirm-send" type="button">確認發送</button><button id="cancel-send" class="secondary" type="button">返回修改</button></div></div></dialog>
</body>
</html>

```

### 修改後

```text
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="對 LINE Bot 傳「我要收通知」，管理者確認加入後即可發送通知。">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src https://*.supabase.co; base-uri 'none'; form-action 'none'">
  <title>LINE 通知練習</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="./style.css">
  <script type="module" src="./app.js"></script>
</head>
<body>
  <main class="shell">
    <nav><a href="../">← 部署練習</a><a href="./setup.html">第一次設定指南 ↗</a></nav>
    <header class="hero"><div><span class="eyebrow">PRACTICE 03 · SUPABASE × LINE</span><h1>讓通知，<br>抵達 LINE。</h1><p>連上後端，登記一位收件人，送出第一則訊息。</p></div><span class="badge" id="connection-status" role="status">尚未連線</span></header>
    <section class="panel connection" aria-labelledby="connect-title">
      <div class="section-head"><span class="step">01</span><div><h2 id="connect-title">連接練習專案</h2><p>填入 Supabase 網址與你設定的管理金鑰。</p></div></div>
      <form id="connect-form">
        <div class="connection-fields"><label>Supabase Project URL<input id="project-url" type="url" placeholder="https://你的專案代號.supabase.co" required autocomplete="off"></label><label>管理金鑰<input id="admin-key" type="password" placeholder="APP_ADMIN_KEY，至少 32 字元" required minlength="32" autocomplete="off" spellcheck="false"></label></div>
        <div class="row"><button id="connect-button">連接後端 <span aria-hidden="true">↗</span></button><button id="disconnect" class="secondary" type="button" hidden>中斷連線</button><span class="hint">金鑰只留在目前頁面，重新整理後需重新輸入。</span></div>
      </form>
      <div id="webhook-box" class="webhook" hidden><span class="label">填入 LINE Developers 的 Webhook URL</span><div class="copy-row"><code id="webhook-url"></code><button id="copy-webhook" type="button" class="secondary small">複製網址</button></div></div>
    </section>
    <div class="workspace">
      <section class="panel" aria-labelledby="pending-title">
        <div class="section-head"><span class="step">02</span><div><h2 id="pending-title">加入收件人</h2><p>對 Bot 傳一句話，再在下方點加入。</p></div></div>
        <div class="subscribe-instructions"><span class="label">請在 LINE 傳送</span><div class="copy-row"><strong>我要收通知</strong><button id="copy-subscribe" class="secondary small" type="button">複製這句話</button></div><p class="hint">個人直接私訊 Bot；群組先邀請 Bot，再在群組傳這句話。</p></div>
        <fieldset id="pending-fields" disabled><legend class="label">待確認的收件對象</legend><p id="pending-summary" class="hint">連接後端後，名單會自動更新。</p><div id="pending-list" aria-live="polite"></div></fieldset>
      </section>
      <section class="panel" aria-labelledby="send-title">
        <div class="section-head"><span class="step">03</span><div><h2 id="send-title">送出第一則通知</h2><p>先檢查對象與內容，確認後才會發送。</p></div></div>
        <form id="send-form"><fieldset id="send-fields" disabled>
          <div class="field-heading"><label for="recipient">收件對象</label><button id="refresh-targets" class="text-button" type="button">重新整理名單 ↻</button></div>
          <select id="recipient" required><option value="">尚無已加入的收件人</option></select>
          <p id="recipient-count" class="hint">先在左側加入收件人。名單每 5 秒自動更新。</p>
          <label>訊息內容<textarea id="message" rows="4" maxlength="1000" required>這是一則來自 LINE 通知練習頁的測試訊息。</textarea></label>
          <div class="row"><button id="preview-button">預覽通知 <span aria-hidden="true">→</span></button><span id="character-count" class="hint"></span></div>
        </fieldset></form>
      </section>
    </div>
    <p id="feedback" class="feedback" role="status" aria-live="polite">第一次使用，先依設定指南部署 Supabase 後端。</p>
    <footer><span>前台 · GitHub Pages</span><span>後端 · Supabase Edge Functions</span><span>每則通知需手動確認</span></footer>
  </main>
  <dialog id="preview-dialog" aria-labelledby="preview-title"><div class="dialog-content"><span class="eyebrow">READY TO SEND</span><h2 id="preview-title">確認這則通知</h2><p class="label">收件對象</p><strong id="preview-recipient"></strong><p class="label">通知內容</p><p id="preview-message" class="message-preview"></p><p class="hint">按下確認後，會真正呼叫 LINE 傳送訊息。</p><p id="send-error" role="alert"></p><div class="row"><button id="confirm-send" type="button">確認發送</button><button id="cancel-send" class="secondary" type="button">返回修改</button></div></div></dialog>
</body>
</html>

```

## public/line/app.js

### 修改前

```text
import { projectBase, makeDraft, callApi } from './client.js';

const $ = id => document.getElementById(id);
let base = '';
let adminKey = '';
let recipients = [];
let draft = null;
let sending = false;
try { $('project-url').value = localStorage.getItem('line-practice-project') ?? 'https://yviqxsvcvlmzmepipjkw.supabase.co'; }
catch { $('project-url').value = 'https://yviqxsvcvlmzmepipjkw.supabase.co'; }

function feedback(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
}
function friendlyError(error) {
  return error.name === 'TimeoutError' || error.name === 'TypeError'
    ? '無法確認連線結果。請檢查網路、函式部署與允許的網站來源；若剛才按了發送，先到 LINE 確認有沒有收到。'
    : error.message;
}
function connected(value) {
  $('pair-fields').disabled = !value;
  $('send-fields').disabled = !value;
  $('connection-status').textContent = value ? '後端已連線' : '尚未連線';
  $('connection-status').classList.toggle('connected', value);
  $('disconnect').hidden = !value;
  $('connect-button').hidden = value;
  $('project-url').disabled = value;
  $('admin-key').disabled = value;
  $('webhook-box').hidden = !value;
  if (!value) $('pair-result').hidden = true;
}
async function refreshRecipients() {
  const data = await callApi(base, adminKey, 'recipients');
  recipients = data.recipients;
  const selected = $('recipient').value;
  $('recipient').replaceChildren(new Option('請選擇收件對象', ''));
  let active = 0;
  for (const target of recipients) {
    const option = new Option(`${target.label} · ${target.kind === 'user' ? '個人' : '群組'}${target.active ? '' : '（已停用）'}`, target.id);
    option.disabled = !target.active;
    $('recipient').add(option);
    if (target.active) active++;
  }
  if (recipients.some(x => x.id === selected && x.active)) $('recipient').value = selected;
  $('recipient-count').textContent = active ? `${active} 位可通知對象` : '尚無可通知對象，請先完成綁定，再重新整理名單。';
}

$('connect-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('connect-button').disabled = true;
  try {
    const nextBase = projectBase($('project-url').value);
    const key = $('admin-key').value;
    const status = await callApi(nextBase, key, 'status');
    base = nextBase;
    adminKey = key;
    $('admin-key').value = '';
    try { localStorage.setItem('line-practice-project', new URL(base).origin); } catch {}
    $('webhook-url').textContent = `${base}/webhook`;
    connected(true);
    await refreshRecipients();
    feedback(status.lineReady ? '資料庫與 LINE 密鑰已就緒。第一次使用請先到 LINE Developers 驗證 Webhook。' : '資料庫已連線；請先到 Supabase 設定 LINE_CHANNEL_SECRET 與 LINE_CHANNEL_ACCESS_TOKEN。');
  } catch (error) {
    adminKey = '';
    connected(false);
    feedback(friendlyError(error), true);
  } finally { $('connect-button').disabled = false; }
});
$('disconnect').addEventListener('click', () => {
  base = ''; adminKey = ''; recipients = []; draft = null;
  $('recipient').replaceChildren(new Option('還沒有綁定的收件對象', ''));
  $('recipient-count').textContent = '完成綁定後，重新整理名單。';
  $('pair-command').textContent = ''; $('webhook-url').textContent = '';
  connected(false);
  feedback('已中斷連線。管理金鑰已從本頁移除。');
});
$('pair-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('pair-button').disabled = true;
  try {
    const data = await callApi(base, adminKey, 'pair', { label: $('target-label').value, kind: $('target-kind').value });
    $('pair-command').textContent = data.command;
    $('pair-expiry').textContent = `有效至 ${new Date(data.expiresAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
    $('pair-result').hidden = false;
    feedback('綁定碼已產生。請對方傳給 LINE Bot，完成後按「重新整理名單」。');
  } catch (error) { feedback(friendlyError(error), true); }
  finally { $('pair-button').disabled = false; }
});
$('refresh-targets').addEventListener('click', async () => {
  $('refresh-targets').disabled = true;
  try { await refreshRecipients(); feedback('收件名單已更新。'); }
  catch (error) { feedback(friendlyError(error), true); }
  finally { $('refresh-targets').disabled = false; }
});
function count() { $('character-count').textContent = `${$('message').value.length} / 1000 字`; }
$('message').addEventListener('input', count);
count();
$('send-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const target = recipients.find(x => x.id === $('recipient').value && x.active);
    if (!target) throw new Error('請先綁定並選擇一位可通知的對象。');
    draft = makeDraft(target.id, $('message').value, draft);
    $('preview-recipient').textContent = `${target.label} · ${target.kind === 'user' ? '個人' : '群組'}`;
    $('preview-message').textContent = draft.text;
    $('send-error').textContent = '';
    $('confirm-send').textContent = '確認發送';
    $('preview-dialog').showModal();
  } catch (error) { feedback(error.message, true); }
});
$('preview-dialog').addEventListener('cancel', event => { if (sending) event.preventDefault(); });
$('cancel-send').addEventListener('click', () => { if (!sending) $('preview-dialog').close(); });
$('confirm-send').addEventListener('click', async () => {
  if (sending || !draft) return;
  sending = true;
  $('confirm-send').disabled = true;
  $('cancel-send').disabled = true;
  $('confirm-send').textContent = '傳送中…';
  try {
    const data = await callApi(base, adminKey, 'send', draft);
    feedback(data.duplicate ? '這筆請求先前已被 LINE 接受，沒有重複發送。請到 LINE 確認是否收到。' : 'LINE 已接受發送請求，請到 LINE 確認是否收到通知。');
    draft = null;
    $('preview-dialog').close();
  } catch (error) {
    $('send-error').textContent = `${friendlyError(error)} 重試同一筆會沿用相同識別碼；請勿重新整理後重送。`;
    $('confirm-send').textContent = '重試同一筆';
  } finally {
    sending = false;
    $('confirm-send').disabled = false;
    $('cancel-send').disabled = false;
  }
});
for (const [button, target] of [['copy-webhook', 'webhook-url'], ['copy-command', 'pair-command']]) {
  $(button).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($(target).textContent); feedback('已複製。'); }
    catch { feedback('無法自動複製，請選取畫面上的文字後手動複製。', true); }
  });
}

```

### 修改後

```text
import { projectBase, makeDraft, callApi } from './client.js';

const $ = id => document.getElementById(id);
let base = '';
let adminKey = '';
let recipients = [];
let draft = null;
let sending = false;
let refreshInFlight = null;
let refreshTimer = null;
let connectionVersion = 0;
let renderedRecipients = '';
try { $('project-url').value = localStorage.getItem('line-practice-project') ?? 'https://yviqxsvcvlmzmepipjkw.supabase.co'; }
catch { $('project-url').value = 'https://yviqxsvcvlmzmepipjkw.supabase.co'; }

function feedback(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
}
function friendlyError(error) {
  return error.name === 'TimeoutError' || error.name === 'TypeError'
    ? '無法確認連線結果。請檢查網路、函式部署與允許的網站來源；若剛才按了發送，先到 LINE 確認有沒有收到。'
    : error.message;
}
function connected(value) {
  $('pending-fields').disabled = !value;
  $('send-fields').disabled = !value;
  $('connection-status').textContent = value ? '後端已連線' : '尚未連線';
  $('connection-status').classList.toggle('connected', value);
  $('disconnect').hidden = !value;
  $('connect-button').hidden = value;
  $('project-url').disabled = value;
  $('admin-key').disabled = value;
  $('webhook-box').hidden = !value;
  if (!value) stopRefreshing();
}
async function refreshRecipients() {
  if (!adminKey) return;
  if (refreshInFlight) return refreshInFlight;
  const version = connectionVersion;
  const task = callApi(base, adminKey, 'recipients').then(data => {
    if (version !== connectionVersion) return;
    recipients = data.recipients;
    const next = JSON.stringify(recipients);
    if (next !== renderedRecipients) { renderRecipients(); renderedRecipients = next; }
  });
  refreshInFlight = task;
  try { await task; } finally { if (refreshInFlight === task) refreshInFlight = null; }
}
function renderRecipients() {
  const selected = $('recipient').value;
  $('recipient').replaceChildren(new Option('請選擇收件對象', ''));
  let active = 0;
  for (const target of recipients.filter(target => target.approved)) {
    const option = new Option(`${target.label} · ${target.kind === 'user' ? '個人' : '群組'}${target.active ? '' : '（已停用）'}`, target.id);
    option.disabled = !target.active;
    $('recipient').add(option);
    if (target.active) active++;
  }
  if (recipients.some(x => x.id === selected && x.active && x.approved)) $('recipient').value = selected;
  $('recipient-count').textContent = active ? `${active} 位可通知對象` : '尚無已加入的收件人，先在左側點「加入收件人」。';
  $('preview-button').disabled = active === 0;
  const pending = recipients.filter(target => target.active && target.approved === false);
  $('pending-summary').textContent = pending.length ? `${pending.length} 位待確認 · 每 5 秒自動更新` : '尚無待確認對象。請對 Bot 傳「我要收通知」，這裡會自動顯示。';
  $('pending-list').replaceChildren();
  for (const target of pending) {
    const row = document.createElement('div'); row.className = 'pending-row';
    const details = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = target.label;
    const kind = document.createElement('span'); kind.className = 'hint'; kind.textContent = target.kind === 'user' ? '個人' : '群組';
    details.append(name, kind);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'small'; button.textContent = '加入收件人';
    button.setAttribute('aria-label', `加入收件人：${target.label}`);
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await callApi(base, adminKey, 'approve', { targetId: target.id, confirm: true });
        if (refreshInFlight) await refreshInFlight.catch(() => {});
        await refreshRecipients();
        if (recipients.some(x => x.id === target.id && x.active && x.approved)) $('recipient').value = target.id;
        feedback(`已加入「${target.label}」，可以預覽並發送通知。`);
      } catch (error) { feedback(friendlyError(error), true); button.disabled = false; }
    });
    row.append(details, button); $('pending-list').append(row);
  }
}
function stopRefreshing() {
  if (refreshTimer !== null) clearInterval(refreshTimer);
  refreshTimer = null;
}
function startRefreshing() {
  stopRefreshing();
  refreshTimer = setInterval(() => {
    if (adminKey && !sending && document.visibilityState === 'visible') {
      refreshRecipients().catch(() => feedback('名單暫時無法更新，請確認連線或按「重新整理名單」。', true));
    }
  }, 5000);
}

$('connect-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('connect-button').disabled = true;
  try {
    const nextBase = projectBase($('project-url').value);
    const key = $('admin-key').value;
    const status = await callApi(nextBase, key, 'status');
    base = nextBase;
    adminKey = key;
    connectionVersion++;
    refreshInFlight = null;
    renderedRecipients = '';
    $('admin-key').value = '';
    try { localStorage.setItem('line-practice-project', new URL(base).origin); } catch {}
    $('webhook-url').textContent = `${base}/webhook`;
    connected(true);
    await refreshRecipients();
    startRefreshing();
    feedback(status.lineReady ? '已連線。對 Bot 傳「我要收通知」，待確認名單會自動更新。' : '資料庫已連線；請先到 Supabase 設定 LINE_CHANNEL_SECRET 與 LINE_CHANNEL_ACCESS_TOKEN。');
  } catch (error) {
    adminKey = '';
    connectionVersion++;
    refreshInFlight = null;
    connected(false);
    feedback(friendlyError(error), true);
  } finally { $('connect-button').disabled = false; }
});
$('disconnect').addEventListener('click', () => {
  base = ''; adminKey = ''; recipients = []; draft = null;
  connectionVersion++;
  refreshInFlight = null;
  renderedRecipients = '';
  $('recipient').replaceChildren(new Option('尚無已加入的收件人', ''));
  $('recipient-count').textContent = '先在左側加入收件人。名單每 5 秒自動更新。';
  $('pending-list').replaceChildren();
  $('pending-summary').textContent = '連接後端後，名單會自動更新。';
  $('webhook-url').textContent = '';
  connected(false);
  feedback('已中斷連線。管理金鑰已從本頁移除。');
});
$('refresh-targets').addEventListener('click', async () => {
  $('refresh-targets').disabled = true;
  try { await refreshRecipients(); feedback('收件名單已更新。'); }
  catch (error) { feedback(friendlyError(error), true); }
  finally { $('refresh-targets').disabled = false; }
});
function count() { $('character-count').textContent = `${$('message').value.length} / 1000 字`; }
$('message').addEventListener('input', count);
count();
$('send-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const target = recipients.find(x => x.id === $('recipient').value && x.active && x.approved);
    if (!target) throw new Error('請先加入並選擇一位可通知的對象。');
    draft = makeDraft(target.id, $('message').value, draft);
    $('preview-recipient').textContent = `${target.label} · ${target.kind === 'user' ? '個人' : '群組'}`;
    $('preview-message').textContent = draft.text;
    $('send-error').textContent = '';
    $('confirm-send').textContent = '確認發送';
    $('preview-dialog').showModal();
  } catch (error) { feedback(error.message, true); }
});
$('preview-dialog').addEventListener('cancel', event => { if (sending) event.preventDefault(); });
$('cancel-send').addEventListener('click', () => { if (!sending) $('preview-dialog').close(); });
$('confirm-send').addEventListener('click', async () => {
  if (sending || !draft) return;
  sending = true;
  $('confirm-send').disabled = true;
  $('cancel-send').disabled = true;
  $('confirm-send').textContent = '傳送中…';
  try {
    const data = await callApi(base, adminKey, 'send', draft);
    feedback(data.duplicate ? '這筆請求先前已被 LINE 接受，沒有重複發送。請到 LINE 確認是否收到。' : 'LINE 已接受發送請求，請到 LINE 確認是否收到通知。');
    draft = null;
    $('preview-dialog').close();
  } catch (error) {
    $('send-error').textContent = `${friendlyError(error)} 重試同一筆會沿用相同識別碼；請勿重新整理後重送。`;
    $('confirm-send').textContent = '重試同一筆';
  } finally {
    sending = false;
    $('confirm-send').disabled = false;
    $('cancel-send').disabled = false;
  }
});
for (const [button, value] of [['copy-webhook', () => $('webhook-url').textContent], ['copy-subscribe', () => '我要收通知']]) {
  $(button).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(value()); feedback('已複製。'); }
    catch { feedback('無法自動複製，請選取畫面上的文字後手動複製。', true); }
  });
}

```

## public/line/setup.html

### 修改前

```text
<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LINE 通知練習 · 設定指南</title><link rel="icon" href="data:,"><link rel="stylesheet" href="./style.css"></head>
<body><main class="shell guide"><nav><a href="./">← LINE 通知練習</a><a href="../">部署練習首頁</a></nav><header class="hero"><div><span class="eyebrow">SETUP · ONE STEP AT A TIME</span><h1>先接好後端，<br>再送第一則通知。</h1><p>前台在 GitHub Pages；LINE 的密鑰與接收程式在 Supabase。</p></div></header>
<section class="panel"><h2>1. 使用獨立的 Supabase 練習專案</h2><p>在專案的 SQL Editor 貼上本專案的 <a href="https://github.com/luckyseal0923/testforlearning/blob/main/supabase/migrations/202611170001_line_practice.sql" target="_blank" rel="noopener">資料表 SQL</a>，執行一次。這會建立收件人、一次性綁定碼與事件去重資料表，並啟用 RLS。只有後端能讀寫，公開網頁無法直接查看 LINE 識別碼。</p><p>這是單一管理者的練習範例，管理金鑰可管理這個練習專案的全部收件對象。</p></section>
<section class="panel"><h2>2. 準備新的 LINE 官方帳號</h2><ol><li>在 LINE Official Account Manager 建立練習帳號。</li><li>到「設定 → Messaging API」啟用，選擇自己的 Provider。</li><li>進入 LINE Developers 的該 Channel，取得 <strong>Channel secret</strong> 與 <strong>Channel access token</strong>。</li><li>要通知群組時，開啟「Allow bot to join group chats」。</li></ol><p>密鑰只填到下一步的 Supabase Secrets。不要放在網頁、GitHub、綁定指令或 Webhook 網址中。</p></section>
<section class="panel"><h2>3. 設定 Supabase Secrets</h2><p>到 Supabase 專案「Edge Functions → Secrets」設定：</p><table><tr><th>名稱</th><th>內容</th></tr><tr><td><code>LINE_CHANNEL_SECRET</code></td><td>LINE Channel 的 secret</td></tr><tr><td><code>LINE_CHANNEL_ACCESS_TOKEN</code></td><td>LINE Channel 的 access token</td></tr><tr><td><code>APP_ADMIN_KEY</code></td><td>自己產生、至少 32 字元的隨機管理金鑰</td></tr><tr><td><code>APP_ALLOWED_ORIGINS</code></td><td><code>https://luckyseal0923.github.io</code></td></tr></table><p>要在本機練習，可把網站來源設成 <code>https://luckyseal0923.github.io,http://localhost:3000</code>。來源只包含通訊協定、主機、連接埠，沒有頁面路徑。</p><p>產生隨機管理金鑰的本機指令（請自己妥善保存輸出）：</p><pre>node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"</pre><p><code>SUPABASE_URL</code> 與 <code>SUPABASE_SERVICE_ROLE_KEY</code> 是 Supabase Hosted Edge Functions 預設提供的後端環境變數，不需貼到前台。</p></section>
<section class="panel"><h2>4. 部署接收程式</h2><p>在電腦專案資料夾的終端機執行，將「你的專案代號」換成 Supabase Project URL 中的代號：</p><pre>npx supabase login
npx supabase link --project-ref 你的專案代號
npx supabase functions deploy line-practice --project-ref 你的專案代號 --no-verify-jwt</pre><p>後端原始碼在 <a href="https://github.com/luckyseal0923/testforlearning/tree/main/supabase/functions/line-practice" target="_blank" rel="noopener">supabase/functions/line-practice</a>。只為這個函式停用平台的 JWT 預檢：Webhook 仍會檢查 LINE 簽章，管理功能仍會檢查管理金鑰。</p></section>
<section class="panel"><h2>5. 連線並驗證 Webhook</h2><ol><li>回到練習頁，填入自己的 Supabase Project URL 與管理金鑰，按「連接後端」。</li><li>複製出現的 Webhook URL，填到 LINE Developers → Messaging API → Webhook settings。</li><li>按 Verify，應顯示 Success，再啟用 Use webhook。這一步不會發送通知。</li></ol><p>網址格式為：</p><pre>https://你的專案代號.supabase.co/functions/v1/line-practice/webhook</pre><p>網址是接收地址，不是發送憑證；可以公開，但後端會驗證每次請求的 LINE 簽章。</p></section>
<section class="panel"><h2>6. 綁定、預覽、確認發送</h2><ol><li>管理頁填收件名稱，選個人或群組，產生綁定碼。</li><li>個人先加 Bot 好友，再把整行綁定指令私訊 Bot；群組先邀請 Bot 入群，再在群組傳送指令。</li><li>綁定碼有效 10 分鐘、只能使用一次。傳送後回管理頁，按「重新整理名單」確認。</li><li>選擇收件人、填入測試訊息，按「預覽通知」。</li><li>確認收件人與內容後按「確認發送」，再到 LINE 查看。LINE 接受請求不代表對方一定收到或已讀。</li></ol><p class="note">只有你在網頁按「確認發送」才會傳送通知。一般聊天不會自動回覆，也不會保存聊天內容。對方封鎖 Bot 或 Bot 離開群組後，收到對應事件會停用該收件對象。</p></section>
<section class="panel"><h2>常見狀況</h2><ul><li>連不上：確認部署成功、管理金鑰相同、網站來源正確。</li><li>Verify 失敗：確認網址尾端是 <code>/webhook</code>、LINE secret 屬於同一個 Channel，並停用這個函式的 JWT 預檢。</li><li>名單沒有更新：確認 Bot 加入正確群組、綁定碼未過期，類型選對；不需把一般 LINE 好友 ID 貼進網站。</li><li>發送失敗：確認 Channel access token 有效、Bot 仍在群組內，並查看 LINE 訊息額度。</li><li>發送結果不明：先到 LINE 查看，不要重新整理後重送；同一頁的「重試同一筆」會沿用同一個去重識別碼。</li></ul><p><a href="https://developers.line.biz/en/docs/messaging-api/building-bot/" target="_blank" rel="noopener">LINE 官方指南</a> · <a href="https://supabase.com/docs/guides/functions/deploy" target="_blank" rel="noopener">Supabase 函式部署說明</a></p></section>
</main></body></html>

```

### 修改後

```text
<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LINE 通知練習 · 設定指南</title><link rel="icon" href="data:,"><link rel="stylesheet" href="./style.css"></head>
<body><main class="shell guide"><nav><a href="./">← LINE 通知練習</a><a href="../">部署練習首頁</a></nav><header class="hero"><div><span class="eyebrow">SETUP · ONE STEP AT A TIME</span><h1>先接好後端，<br>再送第一則通知。</h1><p>前台在 GitHub Pages；LINE 的密鑰與接收程式在 Supabase。</p></div></header>
<section class="panel"><h2>1. 建立或升級 Supabase 資料表</h2><p>全新專案請在 SQL Editor 依序執行：<a href="https://github.com/luckyseal0923/testforlearning/blob/main/supabase/migrations/202611170001_line_practice.sql" target="_blank" rel="noopener">基礎資料表 SQL</a>、<a href="https://github.com/luckyseal0923/testforlearning/blob/main/supabase/migrations/202611180001_line_subscription.sql" target="_blank" rel="noopener">訂閱與核可 SQL</a>。每份只執行一次。已用過舊版時，只執行第二份，既有收件人會保留。</p><p>資料表啟用 RLS，只有後端能讀寫。這是單一管理者的練習範例，管理金鑰可管理這個專案的全部收件對象。</p></section>
<section class="panel"><h2>2. 準備新的 LINE 官方帳號</h2><ol><li>在 LINE Official Account Manager 建立練習帳號。</li><li>到「設定 → Messaging API」啟用，選擇自己的 Provider。</li><li>進入 LINE Developers 的該 Channel，取得 <strong>Channel secret</strong> 與 <strong>Channel access token</strong>。</li><li>要通知群組時，開啟「Allow bot to join group chats」。</li></ol><p>密鑰只填到下一步的 Supabase Secrets。不要放在網頁、GitHub 或 Webhook 網址中。</p></section>
<section class="panel"><h2>3. 設定 Supabase Secrets</h2><p>到 Supabase 專案「Edge Functions → Secrets」設定：</p><table><tr><th>名稱</th><th>內容</th></tr><tr><td><code>LINE_CHANNEL_SECRET</code></td><td>LINE Channel 的 secret</td></tr><tr><td><code>LINE_CHANNEL_ACCESS_TOKEN</code></td><td>LINE Channel 的 access token</td></tr><tr><td><code>APP_ADMIN_KEY</code></td><td>自己產生、至少 32 字元的隨機管理金鑰</td></tr><tr><td><code>APP_ALLOWED_ORIGINS</code></td><td><code>https://luckyseal0923.github.io</code></td></tr></table><p>要在本機練習，可把網站來源設成 <code>https://luckyseal0923.github.io,http://localhost:3000</code>。來源只包含通訊協定、主機、連接埠，沒有頁面路徑。</p><p>產生隨機管理金鑰的本機指令（請自己妥善保存輸出）：</p><pre>node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"</pre><p><code>SUPABASE_URL</code> 與 <code>SUPABASE_SERVICE_ROLE_KEY</code> 是 Supabase Hosted Edge Functions 預設提供的後端環境變數，不需貼到前台。</p></section>
<section class="panel"><h2>4. 部署接收程式</h2><p>在電腦專案資料夾的終端機執行，將「你的專案代號」換成 Supabase Project URL 中的代號：</p><pre>npx supabase login
npx supabase link --project-ref 你的專案代號
npx supabase functions deploy line-practice --project-ref 你的專案代號 --no-verify-jwt</pre><p>後端原始碼在 <a href="https://github.com/luckyseal0923/testforlearning/tree/main/supabase/functions/line-practice" target="_blank" rel="noopener">supabase/functions/line-practice</a>。只為這個函式停用平台的 JWT 預檢：Webhook 仍會檢查 LINE 簽章，管理功能仍會檢查管理金鑰。</p></section>
<section class="panel"><h2>5. 連線並驗證 Webhook</h2><ol><li>回到練習頁，填入自己的 Supabase Project URL 與管理金鑰，按「連接後端」。</li><li>複製出現的 Webhook URL，填到 LINE Developers → Messaging API → Webhook settings。</li><li>按 Verify，應顯示 Success，再啟用 Use webhook。這一步不會發送通知。</li></ol><p>網址格式為：</p><pre>https://你的專案代號.supabase.co/functions/v1/line-practice/webhook</pre><p>網址是接收地址，不是發送憑證；可以公開，但後端會驗證每次請求的 LINE 簽章。</p></section>
<section class="panel"><h2>6. 傳一句話，加入收件人</h2><ol><li>在管理頁連接後端。</li><li>個人加 Bot 好友並私訊「我要收通知」；群組先邀 Bot 入群，再在群組傳這句話。</li><li>網頁的待確認名單會自動顯示對象，約每 5 秒更新一次，不用取名稱或複製綁定碼。無法取得 LINE 名稱時會使用預設名稱。</li><li>管理者點該對象旁的「加入收件人」，才會開放傳送。</li><li>填入測試訊息、預覽並確認發送，再到 LINE 查看。LINE 接受請求不代表一定送達或已讀。</li></ol><p class="note">訂閱與加入名單都不會自動發通知。一般聊天內容不保存；本後端不自動回覆，LINE 官方帳號的預設回覆另依後台設定。封鎖或離群後會停用對象，再訂閱時需重新核可。</p></section>
<section class="panel"><h2>常見狀況</h2><ul><li>連不上：確認部署成功、管理金鑰相同、網站來源正確。</li><li>Verify 失敗：確認網址尾端是 <code>/webhook</code>、LINE secret 屬於同一個 Channel，並停用這個函式的 JWT 預檢。</li><li>名單沒有更新：確認已連線、Bot 在正確對話，且完整送出「我要收通知」。可按「重新整理名單」立即更新；一般聊天不會列入名單。</li><li>發送失敗：確認 Channel access token 有效、Bot 仍在群組內，並查看 LINE 訊息額度。</li><li>發送結果不明：先到 LINE 查看，不要重新整理後重送；同一頁的「重試同一筆」會沿用同一個去重識別碼。</li></ul><p><a href="https://developers.line.biz/en/docs/messaging-api/building-bot/" target="_blank" rel="noopener">LINE 官方指南</a> · <a href="https://supabase.com/docs/guides/functions/deploy" target="_blank" rel="noopener">Supabase 函式部署說明</a></p></section>
</main></body></html>

```

## supabase/functions/line-practice/core.mjs

### 修改前

```text
const encoder = new TextEncoder();
const MAX_BODY = 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PublicError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function hash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

async function sameSecret(actual, expected) {
  const a = await hash(actual);
  const b = await hash(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function validSignature(raw, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(raw));
  } catch { return false; }
}

export function parseBinding(event) {
  const source = event?.source;
  if (!source) return null;
  const kind = source.type;
  const id = kind === 'user' ? source.userId : kind === 'group' ? source.groupId : source.roomId;
  const prefix = { user: 'U', group: 'C', room: 'R' }[kind];
  if (!prefix || typeof id !== 'string' || !new RegExp(`^${prefix}[a-f0-9]{32}$`, 'i').test(id)) return null;
  if (typeof event.webhookEventId !== 'string' || !event.webhookEventId || event.webhookEventId.length > 128) return null;
  if (event.type === 'unfollow' || event.type === 'leave') {
    return { eventId: event.webhookEventId, id, kind, deactivate: true };
  }
  if (event.type !== 'message' || event.message?.type !== 'text') return null;
  const message = typeof event.message.text === 'string' ? event.message.text.trim() : '';
  const match = /^綁定\s+([a-f0-9]{20})$/i.exec(message);
  return match ? { eventId: event.webhookEventId, id, kind, code: match[1].toUpperCase() } : null;
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError(400, '缺少請求內容。');
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) {
      await reader.cancel();
      throw new PublicError(413, '請求內容過大。');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

function decode(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new PublicError(400, '請求必須是 JSON 物件。'); }
}

export function createHandler({ config, repo, push, now = () => Date.now() }) {
  const allowedOrigins = (config.allowedOrigins ?? '').split(',').map(x => x.trim()).filter(Boolean);
  return async function handler(request) {
    const url = new URL(request.url);
    const route = url.pathname.split('/').filter(Boolean).at(-1);
    const webhook = route === 'webhook';
    const origin = request.headers.get('origin');
    const cors = { 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (origin && allowedOrigins.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
    const respond = (status, body) => new Response(JSON.stringify(body), {
      status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
    try {
      if (!webhook && origin && !allowedOrigins.includes(origin)) throw new PublicError(403, '這個網站來源未列入允許清單。');
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...cors,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, x-admin-key, apikey',
        } });
      }
      if (webhook) {
        if (request.method !== 'POST') throw new PublicError(405, 'Webhook 只接受 POST。');
        if (!config.channelSecret) throw new PublicError(503, 'LINE Channel secret 尚未設定。');
        if (!request.headers.get('x-line-signature')) throw new PublicError(401, '缺少 LINE 簽章。');
        const raw = await readJson(request);
        if (!await validSignature(raw, request.headers.get('x-line-signature'), config.channelSecret)) {
          throw new PublicError(401, 'LINE 簽章不正確。');
        }
        const body = decode(raw);
        if (!Array.isArray(body.events)) throw new PublicError(400, '缺少 LINE events。');
        for (const event of body.events) {
          const binding = parseBinding(event);
          if (!binding) continue;
          const { code, ...metadata } = binding;
          await repo.receiveEvent({ ...metadata, codeHash: code ? await hash(code) : null });
        }
        // LINE Verify sends events: []; it must also receive 200.
        return respond(200, { ok: true });
      }

      if (!config.adminKey || config.adminKey.length < 32) throw new PublicError(503, '請先在 Supabase 設定至少 32 字元的管理金鑰。');
      const key = request.headers.get('x-admin-key') ?? '';
      if (!key || !await sameSecret(key, config.adminKey)) throw new PublicError(401, '管理金鑰不正確。');
      if (!['status', 'recipients', 'pair', 'send'].includes(route)) throw new PublicError(404, '找不到這個功能。');
      const get = route === 'status' || route === 'recipients';
      if (request.method !== (get ? 'GET' : 'POST')) throw new PublicError(405, '請求方法不正確。');

      if (get) {
        const recipients = await repo.listTargets();
        if (route === 'recipients') return respond(200, { recipients });
        return respond(200, {
          ok: true, databaseReady: true,
          lineReady: Boolean(config.channelSecret && config.channelAccessToken),
          recipients: recipients.length,
        });
      }
      if (!config.channelSecret || !config.channelAccessToken) throw new PublicError(503, '請先在 Supabase 設定 LINE 的兩項密鑰。');
      const body = decode(await readJson(request));
      if (route === 'pair') {
        const label = typeof body.label === 'string' ? body.label.trim() : '';
        if (!label || label.length > 40 || !['user', 'group'].includes(body.kind)) throw new PublicError(400, '請填入 1–40 字的收件名稱，並選擇個人或群組。');
        const code = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        const expiresAt = new Date(now() + 10 * 60 * 1000).toISOString();
        await repo.savePair({ codeHash: await hash(code), label, kind: body.kind, expiresAt });
        return respond(200, { command: `綁定 ${code}`, expiresAt });
      }
      if (body.confirm !== true) throw new PublicError(400, '請先預覽並確認發送。');
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 1000 || !UUID.test(body.targetId ?? '') || !UUID.test(body.requestId ?? '')) {
        throw new PublicError(400, '收件對象、訊息或發送識別碼不正確。');
      }
      const target = await repo.findTarget(body.targetId);
      if (!target?.active) throw new PublicError(404, '收件對象不存在或已停用，請重新綁定。');
      const result = await push({ to: target.line_id, text, retryKey: body.requestId });
      return respond(200, { ok: true, accepted: true, duplicate: Boolean(result.duplicate) });
    } catch (error) {
      if (error instanceof PublicError) return respond(error.status, { error: error.message });
      // Never return upstream responses, database details, tokens, or request bodies.
      console.error('LINE practice operation failed:', error?.name ?? 'Error');
      return respond(502, { error: '後端處理失敗。請確認資料表、密鑰與 Supabase 執行紀錄；若已按發送，請先查看 LINE 是否收到。' });
    }
  };
}

```

### 修改後

```text
const encoder = new TextEncoder();
const MAX_BODY = 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PublicError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function hash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

async function sameSecret(actual, expected) {
  const a = await hash(actual);
  const b = await hash(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function validSignature(raw, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(raw));
  } catch { return false; }
}

export function parseRecipientEvent(event) {
  const source = event?.source;
  if (!source) return null;
  const kind = source.type;
  const id = kind === 'user' ? source.userId : kind === 'group' ? source.groupId : source.roomId;
  const prefix = { user: 'U', group: 'C', room: 'R' }[kind];
  if (!prefix || typeof id !== 'string' || !new RegExp(`^${prefix}[a-f0-9]{32}$`, 'i').test(id)) return null;
  if (typeof event.webhookEventId !== 'string' || !event.webhookEventId || event.webhookEventId.length > 128) return null;
  if (!Number.isFinite(event.timestamp) || !Number.isFinite(new Date(event.timestamp).getTime())) return null;
  const eventAt = new Date(event.timestamp).toISOString();
  if (event.type === 'unfollow' || event.type === 'leave') {
    return { eventId: event.webhookEventId, id, kind, eventAt, deactivate: true };
  }
  if (event.type !== 'message' || event.message?.type !== 'text') return null;
  const message = typeof event.message.text === 'string' ? event.message.text.trim() : '';
  return message === '我要收通知' ? { eventId: event.webhookEventId, id, kind, eventAt } : null;
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError(400, '缺少請求內容。');
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) {
      await reader.cancel();
      throw new PublicError(413, '請求內容過大。');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

function decode(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new PublicError(400, '請求必須是 JSON 物件。'); }
}

export function createHandler({ config, repo, push, resolveLabel = async (_target) => '' }) {
  const allowedOrigins = (config.allowedOrigins ?? '').split(',').map(x => x.trim()).filter(Boolean);
  return async function handler(request) {
    const url = new URL(request.url);
    const route = url.pathname.split('/').filter(Boolean).at(-1);
    const webhook = route === 'webhook';
    const origin = request.headers.get('origin');
    const cors = { 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (origin && allowedOrigins.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
    const respond = (status, body) => new Response(JSON.stringify(body), {
      status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
    try {
      if (!webhook && origin && !allowedOrigins.includes(origin)) throw new PublicError(403, '這個網站來源未列入允許清單。');
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...cors,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, x-admin-key, apikey',
        } });
      }
      if (webhook) {
        if (request.method !== 'POST') throw new PublicError(405, 'Webhook 只接受 POST。');
        if (!config.channelSecret) throw new PublicError(503, 'LINE Channel secret 尚未設定。');
        if (!request.headers.get('x-line-signature')) throw new PublicError(401, '缺少 LINE 簽章。');
        const raw = await readJson(request);
        if (!await validSignature(raw, request.headers.get('x-line-signature'), config.channelSecret)) {
          throw new PublicError(401, 'LINE 簽章不正確。');
        }
        const body = decode(raw);
        if (!Array.isArray(body.events)) throw new PublicError(400, '缺少 LINE events。');
        for (const event of body.events) {
          const subscription = parseRecipientEvent(event);
          if (!subscription) continue;
          let label = subscription.kind === 'user' ? 'LINE 個人' : 'LINE 群組';
          if (!subscription.deactivate) {
            try {
              const name = await resolveLabel(subscription);
              if (typeof name === 'string' && name.trim()) label = Array.from(name.trim()).slice(0, 40).join('');
            } catch { /* A profile lookup failure must not lose the subscription. */ }
          }
          await repo.receiveSubscription({ ...subscription, label });
        }
        // LINE Verify sends events: []; it must also receive 200.
        return respond(200, { ok: true });
      }

      if (!config.adminKey || config.adminKey.length < 32) throw new PublicError(503, '請先在 Supabase 設定至少 32 字元的管理金鑰。');
      const key = request.headers.get('x-admin-key') ?? '';
      if (!key || !await sameSecret(key, config.adminKey)) throw new PublicError(401, '管理金鑰不正確。');
      if (!['status', 'recipients', 'approve', 'send'].includes(route)) throw new PublicError(404, '找不到這個功能。');
      const get = route === 'status' || route === 'recipients';
      if (request.method !== (get ? 'GET' : 'POST')) throw new PublicError(405, '請求方法不正確。');

      if (get) {
        const recipients = await repo.listTargets();
        if (route === 'recipients') return respond(200, { recipients });
        return respond(200, {
          ok: true, databaseReady: true,
          lineReady: Boolean(config.channelSecret && config.channelAccessToken),
          recipients: recipients.filter(target => target.active && target.approved).length,
          pending: recipients.filter(target => target.active && !target.approved).length,
        });
      }
      const body = decode(await readJson(request));
      if (route === 'approve') {
        if (body.confirm !== true || !UUID.test(body.targetId ?? '')) throw new PublicError(400, '請確認要加入的收件對象。');
        const approved = await repo.approveTarget(body.targetId);
        if (!approved) throw new PublicError(404, '對象已停用或不存在，請對方重新傳送「我要收通知」。');
        return respond(200, { ok: true });
      }
      if (!config.channelSecret || !config.channelAccessToken) throw new PublicError(503, '請先在 Supabase 設定 LINE 的兩項密鑰。');
      if (body.confirm !== true) throw new PublicError(400, '請先預覽並確認發送。');
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 1000 || !UUID.test(body.targetId ?? '') || !UUID.test(body.requestId ?? '')) {
        throw new PublicError(400, '收件對象、訊息或發送識別碼不正確。');
      }
      const target = await repo.findTarget(body.targetId);
      if (!target?.active || target.approved !== true) throw new PublicError(404, '收件對象尚未加入、已停用或不存在。');
      const result = await push({ to: target.line_id, text, retryKey: body.requestId });
      return respond(200, { ok: true, accepted: true, duplicate: Boolean(result.duplicate) });
    } catch (error) {
      if (error instanceof PublicError) return respond(error.status, { error: error.message });
      // Never return upstream responses, database details, tokens, or request bodies.
      console.error('LINE practice operation failed:', error?.name ?? 'Error');
      return respond(502, { error: '後端處理失敗。請確認資料表、密鑰與 Supabase 執行紀錄；若已按發送，請先查看 LINE 是否收到。' });
    }
  };
}

```

## supabase/functions/line-practice/index.ts

### 修改前

```text
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler, PublicError } from './core.mjs';

const config = {
  adminKey: Deno.env.get('APP_ADMIN_KEY') ?? '',
  channelSecret: Deno.env.get('LINE_CHANNEL_SECRET') ?? '',
  channelAccessToken: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '',
  allowedOrigins: Deno.env.get('APP_ALLOWED_ORIGINS') ?? 'https://luckyseal0923.github.io',
};
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error('Database operation failed');
  return result.data;
}
const repo = {
  async listTargets() {
    // Do not expose LINE user/group IDs to the static website.
    return checked(await db.from('line_practice_recipients')
      .select('id,label,kind,active,updated_at').order('created_at', { ascending: false }));
  },
  async savePair(pair: { codeHash: string; label: string; kind: string; expiresAt: string }) {
    checked(await db.from('line_practice_codes').delete().lt('expires_at', new Date().toISOString()));
    checked(await db.from('line_practice_events').delete().lt('received_at', new Date(Date.now() - 7 * 86400000).toISOString()));
    checked(await db.from('line_practice_codes').insert({
      code_hash: pair.codeHash, label: pair.label, kind: pair.kind, expires_at: pair.expiresAt,
    }));
  },
  async receiveEvent(event: { eventId: string; id: string; kind: string; codeHash: string | null; deactivate?: boolean }) {
    return checked(await db.rpc('line_practice_receive', {
      p_event_id: event.eventId, p_line_id: event.id, p_kind: event.kind,
      p_code_hash: event.codeHash, p_deactivate: Boolean(event.deactivate),
    }));
  },
  async findTarget(id: string) {
    return checked(await db.from('line_practice_recipients').select('line_id,active').eq('id', id).maybeSingle());
  },
};

async function push({ to, text, retryKey }: { to: string; text: string; retryKey: string }) {
  const result = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.channelAccessToken}`, 'X-Line-Retry-Key': retryKey },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  // LINE uses 409 plus this header for a retry of an already accepted request.
  if (result.status === 409 && result.headers.get('x-line-accepted-request-id')) return { duplicate: true };
  if (result.status === 429) throw new PublicError(429, 'LINE 傳送額度或速率已達限制，請到 LINE 後台確認。');
  if (!result.ok) throw new PublicError(502, 'LINE 未接受傳送請求，請確認 Token、收件對象與帳號狀態。');
  return { duplicate: false };
}

Deno.serve(createHandler({ config, repo, push }));

```

### 修改後

```text
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler, PublicError } from './core.mjs';

const config = {
  adminKey: Deno.env.get('APP_ADMIN_KEY') ?? '',
  channelSecret: Deno.env.get('LINE_CHANNEL_SECRET') ?? '',
  channelAccessToken: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '',
  allowedOrigins: Deno.env.get('APP_ALLOWED_ORIGINS') ?? 'https://luckyseal0923.github.io',
};
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error('Database operation failed');
  return result.data;
}
const repo = {
  async listTargets() {
    // Do not expose LINE user/group IDs to the static website.
    return checked(await db.from('line_practice_recipients')
      .select('id,label,kind,active,approved,updated_at').order('created_at', { ascending: false }));
  },
  async approveTarget(id: string) {
    return checked(await db.from('line_practice_recipients')
      .update({ approved: true, updated_at: new Date().toISOString() })
      .eq('id', id).eq('active', true).select('id').maybeSingle());
  },
  async receiveSubscription(event: { eventId: string; id: string; kind: string; label: string; eventAt: string; deactivate?: boolean }) {
    return checked(await db.rpc('line_practice_subscription', {
      p_event_id: event.eventId, p_line_id: event.id, p_kind: event.kind,
      p_label: event.label, p_event_at: event.eventAt, p_deactivate: Boolean(event.deactivate),
    }));
  },
  async findTarget(id: string) {
    return checked(await db.from('line_practice_recipients').select('line_id,active,approved').eq('id', id).maybeSingle());
  },
};

async function push({ to, text, retryKey }: { to: string; text: string; retryKey: string }) {
  const result = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.channelAccessToken}`, 'X-Line-Retry-Key': retryKey },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  // LINE uses 409 plus this header for a retry of an already accepted request.
  if (result.status === 409 && result.headers.get('x-line-accepted-request-id')) return { duplicate: true };
  if (result.status === 429) throw new PublicError(429, 'LINE 傳送額度或速率已達限制，請到 LINE 後台確認。');
  if (!result.ok) throw new PublicError(502, 'LINE 未接受傳送請求，請確認 Token、收件對象與帳號狀態。');
  return { duplicate: false };
}

async function resolveLabel({ id, kind }: { id: string; kind: string }) {
  const path = kind === 'user' ? `profile/${id}`
    : kind === 'group' ? `group/${id}/summary` : '';
  if (!path || !config.channelAccessToken) return '';
  const response = await fetch(`https://api.line.me/v2/bot/${path}`, {
    headers: { Authorization: `Bearer ${config.channelAccessToken}` },
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) return '';
  const profile = await response.json();
  return kind === 'user' ? profile.displayName : profile.groupName;
}

Deno.serve(createHandler({ config, repo, push, resolveLabel }));

```
