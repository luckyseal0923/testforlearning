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
