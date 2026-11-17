import { SEND_SCOPE, EMAIL_SCOPE, validEmail, validateDraft, createRawMessage } from './mail.js';

const $ = selector => document.querySelector(selector);
const clientIdKey = 'gmail-lab-client-id';
let clientId = '';
let token = '';
let email = '';
let expiresAt = 0;
let authenticating = false;
let authGeneration = 0;
let sending = false;
let pendingDraft = null;
let lastSent = '';
let sendUncertain = false;

function notice(message, type = '') {
  $('#notice').textContent = message;
  $('#notice').className = `notice ${type}`;
}

function connected() {
  return Boolean(token && email && Date.now() < expiresAt);
}

function updateUI() {
  const ready = connected();
  $('#connection-status').textContent = ready ? '已連接' : authenticating ? '連接中' : '尚未連接';
  $('#connection-status').className = `badge${ready ? ' connected' : ''}`;
  $('#account').textContent = ready ? email : '用你的 Google 帳號授權寄信';
  $('#connect').hidden = ready;
  $('#connect').disabled = authenticating || !clientId || !window.google?.accounts?.oauth2;
  $('#disconnect').hidden = !ready;
  $('#to-self').disabled = !ready || sending;
  $('#send').disabled = !ready || sending || sendUncertain;
  $('#send').textContent = sending ? '正在寄出…' : '確認寄出';
  $('#cancel-preview').disabled = sending;
  $('#client-id').disabled = authenticating || sending;
  $('#settings-form button').disabled = authenticating || sending;
}

function clearSession() {
  authGeneration += 1;
  token = '';
  email = '';
  expiresAt = 0;
  authenticating = false;
  updateUI();
}

function finishAuthError(message) {
  clearSession();
  notice(message, 'error');
}

try { clientId = localStorage.getItem(clientIdKey) || ''; } catch { /* Browser storage may be disabled. */ }
$('#client-id').value = clientId;
$('#origin').textContent = location.origin;
$('#setup').open = !clientId;

$('#settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#client-id').value.trim();
  if (!/^[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(value)) {
    notice('請貼上完整的 OAuth Client ID，結尾應為 apps.googleusercontent.com。', 'error');
    return;
  }
  clearSession();
  clientId = value;
  let saved = true;
  try { localStorage.setItem(clientIdKey, clientId); } catch { saved = false; }
  $('#setup').open = false;
  updateUI();
  notice(saved ? '連線設定已儲存。請點「連接 Google 帳號」，在 Google 視窗完成授權。' : '此頁已套用設定；瀏覽器未允許儲存，重新整理後需再次貼上 Client ID。');
});

$('#copy-origin').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.origin);
    notice('已複製目前網站的 origin，可貼到 Google 的 Authorized JavaScript origins。');
  } catch {
    notice('瀏覽器未允許複製，請手動複製設定區顯示的網址。', 'error');
  }
});

$('#connect').addEventListener('click', () => {
  if (authenticating || sending || !clientId) return;
  if (!window.google?.accounts?.oauth2) {
    notice('Google 登入元件尚未載入，請確認網路後重新整理。', 'error');
    return;
  }
  clearSession();
  authenticating = true;
  const generation = authGeneration;
  updateUI();
  notice('請在 Google 視窗選擇帳號，並允許寄信權限。');
  try {
    const oauth = window.google.accounts.oauth2;
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: `${SEND_SCOPE} ${EMAIL_SCOPE}`,
      include_granted_scopes: false,
      callback: async response => {
        if (generation !== authGeneration) return;
        if (response.error || !response.access_token) {
          finishAuthError('Google 授權未完成。請確認 Client ID、測試使用者與網站 origin 設定。');
          return;
        }
        const canSend = oauth.hasGrantedAllScopes(response, SEND_SCOPE);
        const canIdentify = oauth.hasGrantedAllScopes(response, EMAIL_SCOPE) || oauth.hasGrantedAllScopes(response, 'email');
        if (!canSend || !canIdentify) {
          finishAuthError('缺少寄信或電子郵件地址權限，請重新連接並勾選需要的權限。');
          return;
        }
        try {
          const grantedAt = Date.now();
          const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` }, signal: AbortSignal.timeout(10000),
          });
          if (!profileResponse.ok) throw new Error('無法確認 Google 帳號，請重新連接。');
          const profile = await profileResponse.json();
          if (!validEmail(profile.email) || profile.email_verified !== true) throw new Error('無法確認已驗證的寄件者地址。');
          const lifetime = Number(response.expires_in);
          if (!Number.isFinite(lifetime) || lifetime <= 60) throw new Error('授權有效時間不足，請重新連接。');
          if (generation !== authGeneration) return;
          token = response.access_token;
          email = profile.email;
          expiresAt = grantedAt + lifetime * 1000 - 30000;
          authenticating = false;
          if (!$('#to').value) $('#to').value = email;
          updateUI();
          notice('Gmail 已連接。先寄給自己，按「預覽信件」確認內容後再寄出。', 'success');
        } catch {
          if (generation === authGeneration) finishAuthError('無法確認 Google 帳號。請檢查網路與電子郵件地址權限，再重新連接。');
        }
      },
      error_callback: error => {
        if (generation !== authGeneration) return;
        finishAuthError(error.type === 'popup_closed' ? '你已關閉 Google 授權視窗，尚未連接帳號。' : 'Google 視窗無法開啟，請允許此網站使用彈出視窗後重試。');
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  } catch {
    finishAuthError('無法開始 Google 授權，請檢查 Client ID 與網路後重試。');
  }
});

$('#disconnect').addEventListener('click', () => {
  if (sending) return;
  clearSession();
  notice('已登出此頁並清除暫存授權。若要取消 Google 的應用授權，請使用頁尾「管理 Google 授權」。');
});

$('#to-self').addEventListener('click', () => {
  if (connected()) $('#to').value = email;
});

$('#compose-form').addEventListener('submit', event => {
  event.preventDefault();
  if (sending) return;
  const draft = { to: $('#to').value.trim(), subject: $('#subject').value.trim(), body: $('#body').value };
  try {
    validateDraft(draft);
    if (JSON.stringify(draft) === lastSent) throw new Error('這封信已在本次操作寄出。請先到寄件備份確認，或修改內容再寄送。');
  } catch (error) {
    notice(error.message, 'error');
    return;
  }
  pendingDraft = Object.freeze({ ...draft, from: connected() ? email : '' });
  sendUncertain = false;
  $('#preview-from').textContent = pendingDraft.from || '尚未連接 Gmail';
  $('#preview-to').textContent = draft.to;
  $('#preview-subject').textContent = draft.subject;
  $('#preview-body').textContent = draft.body;
  $('#preview-note').textContent = connected() ? '按下「確認寄出」後，會透過已連接的 Gmail 寄出這封信。' : '目前僅預覽。返回後先連接 Gmail，再重新預覽即可寄送。';
  updateUI();
  $('#preview-dialog').showModal();
});

$('#cancel-preview').addEventListener('click', () => { if (!sending) $('#preview-dialog').close(); });
$('#preview-dialog').addEventListener('cancel', event => { if (sending) event.preventDefault(); });

$('#send').addEventListener('click', async () => {
  if (sending || !pendingDraft || sendUncertain) return;
  if (!connected() || pendingDraft.from !== email) {
    $('#preview-note').textContent = '授權已到期或帳號已變更。請返回、重新連接 Gmail，再預覽信件。';
    clearSession();
    return;
  }
  let raw;
  try { raw = createRawMessage(pendingDraft); } catch (error) { notice(error.message, 'error'); return; }
  sending = true;
  updateUI();
  $('#preview-note').textContent = '正在送交 Gmail，請稍候，不需重複點擊。';
  let rejected = false;
  try {
    const result = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }), signal: AbortSignal.timeout(20000),
    });
    if (!result.ok) {
      rejected = result.status >= 400 && result.status < 500;
      if (result.status === 401) { clearSession(); throw new Error('Gmail 授權已失效。請返回並重新連接帳號。'); }
      if (result.status === 403) throw new Error('Google 拒絕寄送。請確認 Gmail API 已啟用、寄信權限已允許，並檢查 Google 帳號或 Workspace 的使用限制。');
      if (result.status === 429) throw new Error('已達寄送或 API 限制，請稍後再試。本頁不會自動重送。');
      throw new Error(rejected ? 'Gmail 拒絕這次寄送，請確認信件與帳號設定後再試。' : '寄送結果未確認，請先查看 Gmail 寄件備份，避免重複寄送。');
    }
    const receipt = await result.json();
    if (typeof receipt.id !== 'string' || !receipt.id) throw new Error('missing receipt');
    lastSent = JSON.stringify({ to: pendingDraft.to, subject: pendingDraft.subject, body: pendingDraft.body });
    $('#preview-dialog').close();
    $('#sent-link').hidden = false;
    notice(`已送交 Gmail 寄出，收件者：${pendingDraft.to}。你可以在寄件備份確認；實際送達仍由郵件服務處理。`, 'success');
    pendingDraft = null;
  } catch (error) {
    sendUncertain = !rejected;
    const message = rejected ? error.message : '寄送結果未確認。請先查看 Gmail 寄件備份，避免重複寄送；本頁不會自動重送。';
    $('#preview-note').textContent = message;
    $('#sent-link').hidden = false;
    notice(message, 'error');
  } finally {
    sending = false;
    updateUI();
  }
});

window.addEventListener('load', updateUI);
$('#google-library').addEventListener('load', updateUI);
$('#google-library').addEventListener('error', () => notice('Google 登入元件載入失敗，請檢查網路或瀏覽器封鎖設定後重新整理。', 'error'));
window.setInterval(() => {
  if (token && !connected() && !sending) { clearSession(); notice('本次授權已到期，請重新連接 Google 帳號。'); }
}, 15000);
updateUI();
