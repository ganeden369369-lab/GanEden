-- Phase 2 final review: make FREE_DAILY_MESSAGES real. The daily cap was a
-- hard-coded constant inside check_and_increment_usage, so the documented
-- FREE_DAILY_MESSAGES function env var did nothing. The limit is now a
-- parameter chat-send passes in (defaulting to the same 5 as before).

drop function if exists public.check_and_increment_usage(uuid);

create or replace function public.check_and_increment_usage(p_user uuid, p_limit int default 5)
returns int language plpgsql security definer set search_path = public as $$
declare
  current_count int;
  tier text;
begin
  select coalesce(e.tier, 'free') into tier from (select 1) s left join public.entitlements e on e.user_id = p_user;
  insert into public.usage_daily (user_id, date, message_count) values (p_user, current_date, 0)
    on conflict (user_id, date) do nothing;
  select message_count into current_count from public.usage_daily where user_id = p_user and date = current_date for update;
  if tier = 'free' and current_count >= p_limit then
    return -1;
  end if;
  update public.usage_daily set message_count = message_count + 1 where user_id = p_user and date = current_date;
  if tier = 'free' then
    return p_limit - current_count - 1;
  end if;
  return 999;
end $$;

revoke all on function public.check_and_increment_usage(uuid, int) from public;
grant execute on function public.check_and_increment_usage(uuid, int) to service_role;
