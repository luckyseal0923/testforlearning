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
