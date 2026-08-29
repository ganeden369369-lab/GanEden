-- Task 5: chat-send support — chat ownership policies for update/delete,
-- the service-only spend accumulator, and a memory_facts lookup index.

create policy "own chats update" on public.chats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own chats delete" on public.chats for delete using (auth.uid() = user_id);

create or replace function public.add_spend(p_usd numeric) returns void language sql security definer set search_path = public as $$
  insert into public.spend_daily(date, usd) values (current_date, p_usd)
    on conflict (date) do update set usd = public.spend_daily.usd + excluded.usd;
$$;
revoke all on function public.add_spend(numeric) from public;
grant execute on function public.add_spend(numeric) to service_role;

create index if not exists memory_facts_user_created on public.memory_facts(user_id, created_at);
