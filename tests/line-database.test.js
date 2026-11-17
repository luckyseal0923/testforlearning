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
