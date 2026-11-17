import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler, PublicError } from './core.mjs';

const config = {
  adminKey: Deno.env.get('APP_ADMIN_KEY') ?? '',
  channelSecret: Deno.env.get('LINE_CHANNEL_SECRET') ?? '',
  channelAccessToken: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '',
  allowedOrigins: Deno.env.get('APP_ALLOWED_ORIGINS') ?? 'https://luckyseal0923.github.io',
};
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error('Database operation failed');
  return result.data;
}
const repo = {
  async listTargets() {
    // Do not expose LINE user/group IDs to the static website.
    return checked(await db.from('line_practice_recipients')
      .select('id,label,kind,active,approved,updated_at').order('created_at', { ascending: false }));
  },
  async approveTarget(id: string) {
    return checked(await db.from('line_practice_recipients')
      .update({ approved: true, updated_at: new Date().toISOString() })
      .eq('id', id).eq('active', true).select('id').maybeSingle());
  },
  async receiveSubscription(event: { eventId: string; id: string; kind: string; label: string; eventAt: string; deactivate?: boolean }) {
    return checked(await db.rpc('line_practice_subscription', {
      p_event_id: event.eventId, p_line_id: event.id, p_kind: event.kind,
      p_label: event.label, p_event_at: event.eventAt, p_deactivate: Boolean(event.deactivate),
    }));
  },
  async findTarget(id: string) {
    return checked(await db.from('line_practice_recipients').select('line_id,active,approved').eq('id', id).maybeSingle());
  },
};

async function push({ to, text, retryKey }: { to: string; text: string; retryKey: string }) {
  const result = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.channelAccessToken}`, 'X-Line-Retry-Key': retryKey },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  // LINE uses 409 plus this header for a retry of an already accepted request.
  if (result.status === 409 && result.headers.get('x-line-accepted-request-id')) return { duplicate: true };
  if (result.status === 429) throw new PublicError(429, 'LINE 傳送額度或速率已達限制，請到 LINE 後台確認。');
  if (!result.ok) throw new PublicError(502, 'LINE 未接受傳送請求，請確認 Token、收件對象與帳號狀態。');
  return { duplicate: false };
}

async function resolveLabel({ id, kind }: { id: string; kind: string }) {
  const path = kind === 'user' ? `profile/${id}`
    : kind === 'group' ? `group/${id}/summary` : '';
  if (!path || !config.channelAccessToken) return '';
  const response = await fetch(`https://api.line.me/v2/bot/${path}`, {
    headers: { Authorization: `Bearer ${config.channelAccessToken}` },
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) return '';
  const profile = await response.json();
  return kind === 'user' ? profile.displayName : profile.groupName;
}

Deno.serve(createHandler({ config, repo, push, resolveLabel }));
