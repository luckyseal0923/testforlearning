import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('real PostgreSQL schema enforces private access, one-time expiry, event deduplication and deactivation', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../supabase/migrations/202611170001_line_practice.sql', import.meta.url), 'utf8'));
    const uid = `U${'a'.repeat(32)}`;
    const call = async (event, id = uid, kind = 'user', code = 'hash-1', deactivate = false) => {
      const result = await db.query('select public.line_practice_receive($1,$2,$3,$4,$5) as bound', [event, id, kind, code, deactivate]);
      return result.rows[0].bound;
    };
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.line_practice_recipients'), /permission denied/);
    await assert.rejects(call('unauthorized'), /permission denied/);
    await db.exec('reset role');
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.line_practice_codes'), /permission denied/);
    await db.exec('reset role');
    await db.exec('set role service_role');
    await db.query("insert into public.line_practice_codes values ('hash-1','合成收件人','user',now() + interval '10 minutes')");
    assert.equal(await call('wrong-kind', `C${'b'.repeat(32)}`, 'group'), false);
    assert.equal(await call('valid-event'), true);
    assert.equal(await call('valid-event'), false);
    assert.equal(await call('reuse-code', `U${'c'.repeat(32)}`), false);
    assert.equal((await db.query('select count(*)::int as n from public.line_practice_recipients')).rows[0].n, 1);
    await db.query("insert into public.line_practice_codes values ('expired','過期測試','user',now() - interval '1 second')");
    assert.equal(await call('expired-event', uid, 'user', 'expired'), false);
    await call('unfollow', uid, 'user', null, true);
    assert.equal((await db.query('select active from public.line_practice_recipients')).rows[0].active, false);
  } finally { await db.close(); }
});

test('subscription migration preserves existing recipients and keeps new opt-ins pending until approval', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../supabase/migrations/202611170001_line_practice.sql', import.meta.url), 'utf8'));
    const existing = `U${'d'.repeat(32)}`;
    const uid = `U${'a'.repeat(32)}`;
    await db.query("insert into public.line_practice_recipients(label,kind,line_id) values ('既有收件人','user',$1)", [existing]);
    await db.exec(await readFile(new URL('../supabase/migrations/202611180001_line_subscription.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('select approved from public.line_practice_recipients where line_id=$1', [existing])).rows[0].approved, true);
    const call = async (event, when, deactivate = false, label = '合成訂閱者') => db.query(
      "select public.line_practice_subscription($1,$2,'user',$3,$4,$5)", [event, uid, label, when, deactivate]);
    await db.exec('set role anon');
    await assert.rejects(call('unauthorized', '2026-11-18T00:00:00Z'), /permission denied/);
    await assert.rejects(db.query('select * from public.line_practice_recipients'), /permission denied/);
    await db.exec('reset role; set role service_role');
    await call('subscribe', '2026-11-18T00:00:00Z');
    const target = async () => (await db.query('select * from public.line_practice_recipients where line_id=$1', [uid])).rows[0];
    assert.equal((await target()).approved, false);
    assert.equal((await target()).active, true);
    await db.query('update public.line_practice_recipients set approved=true where line_id=$1 and active=true', [uid]);
    await call('subscribe', '2026-11-18T00:00:00Z');
    await call('repeat-subscribe', '2026-11-18T00:01:00Z', false, '新名稱');
    assert.equal((await target()).approved, true);
    assert.equal((await target()).label, '合成訂閱者');
    await call('unfollow', '2026-11-18T00:03:00Z', true);
    assert.equal((await target()).active, false);
    assert.equal((await target()).approved, false);
    await call('old-subscription', '2026-11-18T00:02:00Z');
    assert.equal((await target()).active, false);
    await call('new-subscription', '2026-11-18T00:04:00Z');
    assert.equal((await target()).active, true);
    assert.equal((await target()).approved, false);
    await call('old-unfollow', '2026-11-18T00:03:30Z', true);
    assert.equal((await target()).active, true);
    assert.equal((await db.query('select count(*)::int as n from public.line_practice_recipients')).rows[0].n, 2);
  } finally { await db.close(); }
});
