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
