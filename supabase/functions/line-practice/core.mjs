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
