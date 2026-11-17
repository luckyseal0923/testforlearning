-- Run only in the separate LINE practice project.
begin;

create table public.line_practice_recipients (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),
  kind text not null check (kind in ('user', 'group', 'room')),
  line_id text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.line_practice_codes (
  code_hash text primary key,
  label text not null,
  kind text not null check (kind in ('user', 'group')),
  expires_at timestamptz not null
);

-- IDs only: do not retain users' message contents or LINE reply tokens.
create table public.line_practice_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);

alter table public.line_practice_recipients enable row level security;
alter table public.line_practice_codes enable row level security;
alter table public.line_practice_events enable row level security;
revoke all on public.line_practice_recipients from anon, authenticated;
revoke all on public.line_practice_codes from anon, authenticated;
revoke all on public.line_practice_events from anon, authenticated;
grant all on public.line_practice_recipients to service_role;
grant all on public.line_practice_codes to service_role;
grant all on public.line_practice_events to service_role;

-- Event deduplication and one-time-code consumption share one transaction.
create function public.line_practice_receive(
  p_event_id text, p_line_id text, p_kind text,
  p_code_hash text default null, p_deactivate boolean default false
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare
  v_label text;
  v_inserted integer;
begin
  insert into public.line_practice_events(event_id) values (p_event_id)
    on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;

  if p_deactivate then
    update public.line_practice_recipients
      set active = false, updated_at = now()
      where line_id = p_line_id and kind = p_kind;
    return false;
  end if;

  delete from public.line_practice_codes
    where code_hash = p_code_hash and kind = p_kind and expires_at > now()
    returning label into v_label;
  if v_label is null then return false; end if;

  insert into public.line_practice_recipients(label, kind, line_id)
    values (v_label, p_kind, p_line_id)
    on conflict (line_id) do update
      set label = excluded.label, kind = excluded.kind,
          active = true, updated_at = now();
  return true;
end;
$$;
revoke all on function public.line_practice_receive(text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.line_practice_receive(text,text,text,text,boolean) to service_role;

comment on table public.line_practice_recipients is 'LINE 練習收件對象，僅後端 service_role 可存取';
commit;
