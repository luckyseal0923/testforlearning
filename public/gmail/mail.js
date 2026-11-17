export const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';

export function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && !/[\r\n]/.test(value)
    && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value);
}

export function validateDraft({ to, subject, body }) {
  if (!validEmail(to)) throw new Error('請輸入一位收件者的有效電子郵件地址。');
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 120 || /[\r\n]/.test(subject)) {
    throw new Error('主旨需為 1～120 字，且不可換行。');
  }
  if (typeof body !== 'string' || !body.trim() || body.length > 20000) {
    throw new Error('請填寫信件內容，最多 20,000 字。');
  }
}

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

function encodedSubject(subject) {
  const chunks = [];
  let chunk = '';
  for (const character of subject) {
    if (new TextEncoder().encode(chunk + character).length > 42) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map(part => `=?UTF-8?B?${base64(part)}?=`).join('\r\n ');
}

export function createRawMessage({ from, to, subject, body }, date = new Date()) {
  validateDraft({ to, subject, body });
  if (!validEmail(from)) throw new Error('請先連接有效的 Google 帳號。');
  const content = base64(body.replace(/\r\n|\r|\n/g, '\r\n')).match(/.{1,76}/g).join('\r\n');
  const mime = [
    `From: ${from}`, `To: ${to}`, `Subject: ${encodedSubject(subject)}`, `Date: ${date.toUTCString()}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', content, '',
  ].join('\r\n');
  return base64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
