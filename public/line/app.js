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
