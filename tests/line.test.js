import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHandler, validSignature, parseRecipientEvent } from '../supabase/functions/line-practice/core.mjs';
import { projectBase, makeDraft, callApi } from '../public/line/client.js';

const adminKey = 'synthetic-admin-key-for-unit-tests-only';
const channelSecret = 'synthetic-line-secret';
const origin = 'https://luckyseal0923.github.io';
const userId = `U${'a'.repeat(32)}`;
const groupId = `C${'b'.repeat(32)}`;
const targetId = '11111111-1111-4111-8111-111111111111';
function fixture(overrides = {}) {
  const state = { pushed: [], events: [], approvals: [], targets: [{ id: targetId, label: '合成測試收件人', active: true, approved: true, line_id: userId }] };
  const repo = {
    async listTargets() { return state.targets.map(({ line_id, ...target }) => target); },
    async approveTarget(id) {
      const target = state.targets.find(x => x.id === id && x.active);
      if (!target) return null;
      target.approved = true; state.approvals.push(id); return { id };
    },
    async receiveSubscription(event) { state.events.push(event); },
    async findTarget(id) { return state.targets.find(x => x.id === id); },
    ...overrides.repo,
  };
  const handler = createHandler({
    config: { adminKey, channelSecret, channelAccessToken: 'synthetic-token', allowedOrigins: origin, ...overrides.config },
    repo, push: async message => { state.pushed.push(message); return { duplicate: false }; },
    resolveLabel: overrides.resolveLabel ?? (async () => '合成 LINE 名稱'),
  });
  return { state, handler };
}
function request(route, body, options = {}) {
  return new Request(`https://example.supabase.co/functions/v1/line-practice/${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'x-admin-key': adminKey, origin, 'content-type': 'application/json', ...options.headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...options,
  });
}
function webhook(body, signature) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('https://example.supabase.co/functions/v1/line-practice/webhook', {
    method: 'POST', headers: { 'x-line-signature': signature ?? createHmac('sha256', channelSecret).update(raw).digest('base64') }, body: raw,
  });
}
const event = { webhookEventId: 'synthetic-event-1', timestamp: Date.UTC(2026, 10, 18), type: 'message', source: { type: 'user', userId }, message: { type: 'text', text: '我要收通知' } };

test('LINE HMAC verifies the original bytes and rejects changed content', async () => {
  const raw = '{"events":[]}';
  const signature = createHmac('sha256', channelSecret).update(raw).digest('base64');
  assert.equal(await validSignature(raw, signature, channelSecret), true);
  assert.equal(await validSignature('{ "events":[]}', signature, channelSecret), false);
  assert.equal(await validSignature(raw, 'invalid!', channelSecret), false);
});
test('LINE Verify with empty events succeeds without authentication or messages', async () => {
  const { handler, state } = fixture();
  assert.equal((await handler(webhook({ events: [] }))).status, 200);
  assert.equal(state.pushed.length, 0);
  assert.equal(state.events.length, 0);
});
test('unsigned/forged webhooks cannot register recipients', async () => {
  const { handler, state } = fixture();
  assert.equal((await handler(webhook({ events: [event] }, 'forged'))).status, 401);
  assert.equal(state.events.length, 0);
});
test('signed subscription records its LINE name and identity without content, approval or messages', async () => {
  const { handler, state } = fixture();
  assert.equal((await handler(webhook({ events: [event] }))).status, 200);
  assert.equal(state.events[0].label, '合成 LINE 名稱');
  assert.equal(state.events[0].eventAt, '2026-11-18T00:00:00.000Z');
  assert.equal(state.events[0].id, userId);
  assert.equal('message' in state.events[0], false);
  assert.equal('approved' in state.events[0], false);
  assert.equal(state.approvals.length, 0);
  assert.equal(state.pushed.length, 0);
});
test('ordinary chat is ignored; groups use group ID rather than sender ID', () => {
  assert.equal(parseRecipientEvent({ ...event, message: { type: 'text', text: '你好' } }), null);
  assert.equal(parseRecipientEvent({ ...event, source: { type: 'group', groupId, userId } }).id, groupId);
  assert.equal(parseRecipientEvent({ ...event, source: { type: 'group', groupId: userId } }), null);
  assert.equal(parseRecipientEvent({ ...event, timestamp: null }), null);
});
test('profile lookup failures retain a pending subscription using a fallback name', async () => {
  const { handler, state } = fixture({ resolveLabel: async () => { throw new Error('profile unavailable'); } });
  assert.equal((await handler(webhook({ events: [event] }))).status, 200);
  assert.equal(state.events[0].label, 'LINE 個人');
  assert.equal(state.pushed.length, 0);
});
test('unfollow and leave events deactivate the correct target', async () => {
  const { handler, state } = fixture();
  const leave = { webhookEventId: 'leave-1', timestamp: event.timestamp, type: 'leave', source: { type: 'group', groupId } };
  await handler(webhook({ events: [leave] }));
  assert.equal(state.events[0].deactivate, true);
  assert.equal(state.events[0].id, groupId);
});
test('management rejects missing/wrong keys and untrusted browser origins', async () => {
  const { handler } = fixture();
  assert.equal((await handler(request('status', undefined, { headers: {} }))).status, 401);
  assert.equal((await handler(request('status', undefined, { headers: { 'x-admin-key': 'wrong' } }))).status, 401);
  const response = await handler(request('status', undefined, { headers: { origin: 'https://evil.example', 'x-admin-key': adminKey } }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
test('allowed CORS preflight succeeds; recipient API hides LINE IDs', async () => {
  const { handler } = fixture();
  const preflight = await handler(request('status', undefined, { method: 'OPTIONS', headers: { origin } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  const response = await handler(request('recipients'));
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(await response.json()).includes(userId), false);
});
test('joining a recipient requires an authenticated explicit administrator action and sends nothing', async () => {
  const { handler, state } = fixture();
  state.targets[0].approved = false;
  assert.equal((await handler(request('approve', { targetId }))).status, 400);
  assert.equal((await handler(request('approve', { targetId, confirm: true }, { headers: {} }))).status, 401);
  assert.equal(state.approvals.length, 0);
  assert.equal((await handler(request('approve', { targetId, confirm: true }))).status, 200);
  assert.equal(state.targets[0].approved, true);
  assert.deepEqual(state.approvals, [targetId]);
  assert.equal(state.pushed.length, 0);
});
test('pending recipients cannot receive messages even with a valid administrator key', async () => {
  const { handler, state } = fixture();
  state.targets[0].approved = false;
  const response = await handler(request('send', { targetId, confirm: true, requestId: crypto.randomUUID(), text: '合成測試' }));
  assert.equal(response.status, 404);
  assert.equal(state.pushed.length, 0);
  const status = await (await handler(request('status'))).json();
  assert.equal(status.recipients, 0);
  assert.equal(status.pending, 1);
});
test('inactive recipients cannot be approved; retired pairing endpoint is unavailable', async () => {
  const { handler, state } = fixture();
  state.targets[0].active = false;
  assert.equal((await handler(request('approve', { targetId, confirm: true }))).status, 404);
  assert.equal((await handler(request('pair', { label: '舊流程', kind: 'user' }))).status, 404);
  assert.equal(state.approvals.length, 0);
});
test('send requires explicit confirmation and a known active recipient', async () => {
  const { handler, state } = fixture();
  const body = { targetId, text: '合成測試', requestId: crypto.randomUUID() };
  assert.equal((await handler(request('send', body))).status, 400);
  assert.equal(state.pushed.length, 0);
  assert.equal((await handler(request('send', { ...body, confirm: true, targetId: crypto.randomUUID() }))).status, 404);
  state.targets[0].active = false;
  assert.equal((await handler(request('send', { ...body, confirm: true }))).status, 404);
  assert.equal(state.pushed.length, 0);
});
test('confirmed send resolves its destination server-side and keeps the retry key', async () => {
  const { handler, state } = fixture();
  const requestId = crypto.randomUUID();
  const response = await handler(request('send', { targetId, text: '  合成測試  ', requestId, confirm: true, to: 'attacker-controlled' }));
  assert.equal(response.status, 200);
  assert.deepEqual(state.pushed, [{ to: userId, text: '合成測試', retryKey: requestId }]);
});
test('unexpected backend errors do not reveal secrets or upstream details', async () => {
  const { handler } = fixture({ repo: { async listTargets() { throw new Error('private database connection and secret'); } } });
  const response = await handler(request('status'));
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('private database'), false);
});
test('browser sends keys only in headers and rejects unsafe project URLs', async () => {
  for (const url of ['http://example.supabase.co', 'https://evil.example', 'https://example.supabase.co/path', 'https://user:pass@example.supabase.co', 'https://example.supabase.co/?key=private']) {
    assert.throws(() => projectBase(url));
  }
  const base = projectBase('https://example.supabase.co/');
  let sent;
  await callApi(base, adminKey, 'status', undefined, async (url, options) => {
    sent = { url, options }; return Response.json({ ok: true });
  });
  assert.equal(sent.url.includes(adminKey), false);
  assert.equal(sent.options.headers['x-admin-key'], adminKey);
});
test('preview creates no network call and retry reuses the same immutable request', () => {
  const first = makeDraft(targetId, '  合成測試  ');
  assert.equal(Object.isFrozen(first), true);
  assert.equal(makeDraft(targetId, '合成測試', first), first);
  assert.notEqual(makeDraft(targetId, '另一筆', first).requestId, first.requestId);
});
