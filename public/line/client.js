export function projectBase(value) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
    || url.username || url.password || url.port || !['', '/'].includes(url.pathname) || url.search || url.hash) {
    throw new Error('請填入自己的 Supabase Project URL，例如 https://專案代號.supabase.co。');
  }
  return `${url.origin}/functions/v1/line-practice`;
}

export function makeDraft(targetId, text, previous) {
  text = text.trim();
  if (!targetId || !text || text.length > 1000) throw new Error('請選擇收件對象，並填入 1–1000 字的訊息。');
  if (previous?.targetId === targetId && previous.text === text) return previous;
  return Object.freeze({ targetId, text, requestId: crypto.randomUUID(), confirm: true });
}

export async function callApi(base, key, route, body, fetcher = fetch) {
  const response = await fetcher(`${base}/${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '後端尚未就緒，請依設定指南檢查函式部署與設定。');
  return data;
}
