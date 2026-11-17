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
