import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { SEND_SCOPE, EMAIL_SCOPE, validEmail, validateDraft, createRawMessage } from '../public/gmail/mail.js';

const draft = { from: 'learner@example.com', to: 'learner@example.com', subject: '中文測試信 ✉️', body: '你好！\n這是一封測試信。' };
const source = (await readFile(new URL('../public/gmail/app.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/, '');

function decodeRaw(raw) {
  return Buffer.from(raw, 'base64url').toString('utf8');
}

function harness({ granted = true, sendHandler } = {}) {
  const elements = new Map();
  const calls = [];
  const saved = new Map();
  let authConfig;
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', textContent: '', className: '', hidden: false, disabled: false, open: false, handlers: {},
      addEventListener(event, handler) { this.handlers[event] = handler; },
      showModal() { this.open = true; }, close() { this.open = false; },
    });
    return elements.get(selector);
  };
  const oauth = {
    initTokenClient(config) { authConfig = config; return { requestAccessToken() {} }; },
    hasGrantedAllScopes() { return granted; },
  };
  runInNewContext(source, {
    SEND_SCOPE, EMAIL_SCOPE, validEmail, validateDraft, createRawMessage,
    document: { querySelector: element },
    window: { google: { accounts: { oauth2: oauth } }, addEventListener() {}, setInterval() {} },
    localStorage: { getItem() { return '123456-test.apps.googleusercontent.com'; }, setItem(key, value) { saved.set(key, value); } },
    location: { origin: 'https://example.com' }, navigator: { clipboard: { async writeText() {} } },
    Date, Number, JSON, Object, Error, AbortSignal,
    async fetch(url, options) {
      calls.push({ url, options });
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        return { ok: true, async json() { return { email: draft.from, email_verified: true }; } };
      }
      assert.equal(url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
      if (sendHandler) return sendHandler(options);
      return { ok: true, status: 200, async json() { return { id: 'synthetic-message' }; } };
    },
  });
  const emit = (selector, event = 'click') => element(selector).handlers[event]({ preventDefault() {} });
  const fill = () => { for (const key of ['to', 'subject', 'body']) element(`#${key}`).value = draft[key]; };
  const authorize = async () => {
    emit('#connect');
    await authConfig.callback({ access_token: 'synthetic-token-not-a-real-credential', expires_in: 3600 });
  };
  return { element, calls, saved, emit, fill, authorize, get authConfig() { return authConfig; } };
}

test('MIME preserves Chinese, emoji, body line breaks and uses base64url', () => {
  const raw = createRawMessage(draft, new Date('2026-11-17T12:00:00Z'));
  assert.match(raw, /^[A-Za-z0-9_-]+$/);
  const mime = decodeRaw(raw);
  const [headers, content] = mime.split('\r\n\r\n');
  assert.ok(headers.includes(`From: ${draft.from}`));
  assert.ok(headers.includes(`To: ${draft.to}`));
  const subject = [...headers.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map(match => Buffer.from(match[1], 'base64').toString('utf8')).join('');
  assert.equal(subject, draft.subject);
  assert.equal(Buffer.from(content, 'base64').toString('utf8'), draft.body.replace(/\n/g, '\r\n'));
});

test('long UTF-8 subjects fold into valid encoded words without breaking characters', () => {
  const subject = '中文測試🙂'.repeat(15);
  const mime = decodeRaw(createRawMessage({ ...draft, subject }));
  const words = [...mime.split('\r\n\r\n')[0].matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)];
  assert.ok(words.length > 1);
  assert.ok(words.every(word => word[0].length <= 75));
  assert.equal(words.map(word => Buffer.from(word[1], 'base64').toString('utf8')).join(''), subject);
});

test('rejects header injection, multiple recipients and empty or oversized messages', () => {
  for (const to of ['a@example.com\r\nBcc: other@example.com', 'a@example.com,b@example.com', 'Name <a@example.com>']) {
    assert.throws(() => createRawMessage({ ...draft, to }));
  }
  assert.throws(() => createRawMessage({ ...draft, from: 'a@example.com\r\nX: y' }));
  assert.throws(() => createRawMessage({ ...draft, subject: 'hello\nBcc: x' }));
  assert.throws(() => validateDraft({ ...draft, body: ' ' }));
  assert.throws(() => validateDraft({ ...draft, body: 'a'.repeat(20001) }));
});

test('preview works before login and cannot send without authorization', async () => {
  const h = harness();
  h.fill();
  h.emit('#compose-form', 'submit');
  assert.equal(h.element('#preview-dialog').open, true);
  assert.equal(h.element('#send').disabled, true);
  await h.emit('#send');
  assert.equal(h.calls.length, 0);
});

test('requests only send and email scopes; denied scopes cannot unlock sending', async () => {
  const h = harness({ granted: false });
  await h.authorize();
  assert.equal(h.authConfig.scope, `${SEND_SCOPE} ${EMAIL_SCOPE}`);
  assert.equal(h.authConfig.include_granted_scopes, false);
  assert.equal(h.element('#send').disabled, true);
  assert.equal(h.calls.length, 0);
});

test('connecting and previewing do not send; double click sends once after confirmation', async () => {
  const h = harness();
  await h.authorize();
  assert.equal(h.calls.length, 1);
  assert.equal(h.element('#account').textContent, draft.from);
  h.fill();
  h.emit('#compose-form', 'submit');
  assert.equal(h.calls.length, 1);
  await Promise.all([h.emit('#send'), h.emit('#send')]);
  const sends = h.calls.filter(call => call.url.includes('/messages/send'));
  assert.equal(sends.length, 1);
  assert.equal(sends[0].options.method, 'POST');
  assert.ok(decodeRaw(JSON.parse(sends[0].options.body).raw).includes(`To: ${draft.to}`));
  assert.equal(h.element('#preview-dialog').open, false);
  assert.ok(h.element('#notice').textContent.includes('已送交 Gmail'));
  h.emit('#compose-form', 'submit');
  assert.equal(h.element('#preview-dialog').open, false);
  assert.ok(h.element('#notice').textContent.includes('已在本次操作寄出'));
  assert.equal(h.saved.size, 0, 'tokens and messages must never be persisted');
});

test('unknown result blocks another send and never auto-retries', async () => {
  const h = harness({ sendHandler() { throw new TypeError('synthetic network interruption'); } });
  await h.authorize(); h.fill(); h.emit('#compose-form', 'submit');
  await h.emit('#send');
  assert.equal(h.element('#send').disabled, true);
  assert.ok(h.element('#preview-note').textContent.includes('結果未確認'));
  await h.emit('#send');
  assert.equal(h.calls.filter(call => call.url.includes('/messages/send')).length, 1);
});

test('401 clears the session; logout blocks sends and does not revoke grants silently', async () => {
  const h = harness({ sendHandler() { return { ok: false, status: 401 }; } });
  await h.authorize(); h.fill(); h.emit('#compose-form', 'submit'); await h.emit('#send');
  assert.equal(h.element('#connection-status').textContent, '尚未連接');
  assert.equal(h.element('#send').disabled, true);
  assert.ok(h.element('#preview-note').textContent.includes('重新連接'));
  const second = harness(); await second.authorize(); second.emit('#disconnect');
  assert.equal(second.element('#send').disabled, true);
  assert.equal(second.calls.length, 1);
});
