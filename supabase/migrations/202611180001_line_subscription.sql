-- Preserve existing recipients; new subscriptions require the administrator's approval.
begin;
alter table public.line_practice_recipients
  add column approved boolean not null default true,
  add column last_event_at timestamptz not null default '-infinity';

create function public.line_practice_subscription(
  p_event_id text, p_line_id text, p_kind text, p_label text,
  p_event_at timestamptz, p_deactivate boolean default false
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare v_inserted integer;
begin
  delete from public.line_practice_events where received_at < now() - interval '7 days';
  insert into public.line_practice_events(event_id) values (p_event_id)
    on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;

  if p_deactivate then
    update public.line_practice_recipients
      set active = false, approved = false, last_event_at = p_event_at, updated_at = now()
      where line_id = p_line_id and kind = p_kind and last_event_at <= p_event_at;
    return false;
  end if;

  insert into public.line_practice_recipients(label, kind, line_id, approved, last_event_at)
    values (p_label, p_kind, p_line_id, false, p_event_at)
    on conflict (line_id) do update
      set label = case when public.line_practice_recipients.approved
                       then public.line_practice_recipients.label else excluded.label end,
          approved = case when public.line_practice_recipients.active
                          then public.line_practice_recipients.approved else false end,
          active = true, last_event_at = p_event_at, updated_at = now()
      where public.line_practice_recipients.last_event_at <= p_event_at;
  return true;
end;
$$;
revoke all on function public.line_practice_subscription(text,text,text,text,timestamptz,boolean)
  from public, anon, authenticated;
grant execute on function public.line_practice_subscription(text,text,text,text,timestamptz,boolean)
  to service_role;
commit;
