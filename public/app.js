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
