-- Extensions
create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  full_name_script text not null check (full_name_script in ('he','latin')),
  dob date not null,
  language text not null check (language in ('he','en')),
  relationship_status text not null check (relationship_status in ('single','dating','relationship','married')),
  goals text[] not null check (cardinality(goals) >= 1),
  numbers jsonb not null,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ---------- chats & messages ----------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  archived boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.chats enable row level security;
create policy "own chats" on public.chats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index chats_user_last on public.chats (user_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  status text not null default 'complete' check (status in ('complete','partial','error')),
  input_tokens int,
  output_tokens int,
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "own messages read" on public.messages for select using (auth.uid() = user_id);
create policy "own messages insert user role" on public.messages for insert with check (auth.uid() = user_id and role = 'user');
create index messages_chat_created on public.messages (chat_id, created_at);

-- ---------- memory ----------
create table public.memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('person','situation','preference')),
  text text not null,
  source_chat_id uuid,
  last_referenced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.memory_facts enable row level security;
create policy "own facts read" on public.memory_facts for select using (auth.uid() = user_id);
create policy "own facts delete" on public.memory_facts for delete using (auth.uid() = user_id);

create table public.memory_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  summary text not null default '',
  facts_hash text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.memory_summaries enable row level security;
create policy "own summary read" on public.memory_summaries for select using (auth.uid() = user_id);

-- ---------- quotes ----------
create table public.daily_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  language text not null check (language in ('he','en')),
  text text not null,
  theme text not null,
  personal_day int not null,
  batch_id uuid not null,
  prompt_version text not null,
  model text not null,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, for_date)
);
alter table public.daily_quotes enable row level security;
create policy "own quotes read" on public.daily_quotes for select using (auth.uid() = user_id);
create policy "own quotes mark shared" on public.daily_quotes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke update on public.daily_quotes from authenticated;
grant update (shared_at) on public.daily_quotes to authenticated;

create table public.quote_fallbacks (
  id serial primary key,
  language text not null check (language in ('he','en')),
  text text not null,
  theme text not null
);
alter table public.quote_fallbacks enable row level security;
create policy "fallbacks readable" on public.quote_fallbacks for select using (auth.role() = 'authenticated');

-- ---------- partners & compatibility ----------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  full_name text not null,
  full_name_script text not null check (full_name_script in ('he','latin')),
  dob date not null,
  numbers jsonb not null,
  engine_version text not null,
  created_at timestamptz not null default now()
);
alter table public.partners enable row level security;
create policy "own partners" on public.partners for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.compatibility_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  language text not null check (language in ('he','en')),
  numbers jsonb not null,
  narrative jsonb not null,
  engine_version text not null,
  prompt_version text not null,
  model text not null,
  created_at timestamptz not null default now()
);
alter table public.compatibility_readings enable row level security;
create policy "own readings read" on public.compatibility_readings for select using (auth.uid() = user_id);

-- ---------- usage & spend ----------
create table public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  message_count int not null default 0,
  primary key (user_id, date)
);
alter table public.usage_daily enable row level security;
create policy "own usage read" on public.usage_daily for select using (auth.uid() = user_id);

create table public.spend_daily (
  date date primary key,
  usd numeric(10,4) not null default 0
);
alter table public.spend_daily enable row level security; -- service role only

-- ---------- content & prompts ----------
create table public.content_meanings (
  number_type text not null check (number_type in ('life_path','expression','soul_urge','personality','birthday')),
  value int not null,
  language text not null check (language in ('he','en')),
  title text not null,
  body text not null,
  approved boolean not null default false,
  primary key (number_type, value, language)
);
alter table public.content_meanings enable row level security;
create policy "meanings readable" on public.content_meanings for select using (auth.role() = 'authenticated');

create table public.prompt_versions (
  id serial primary key,
  kind text not null check (kind in ('mentor','quotes','compat','memory','title')),
  version text not null,
  body text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (kind, version)
);
alter table public.prompt_versions enable row level security; -- service role only

-- ---------- push ----------
create table public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android')),
  notify_time time not null default '08:00',
  tz text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "own tokens" on public.push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- entitlements (P1) ----------
create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free',
  source text,
  expires_at timestamptz
);
alter table public.entitlements enable row level security;
create policy "own entitlement read" on public.entitlements for select using (auth.uid() = user_id);

-- ---------- functions ----------
-- Atomic free-tier cap. Returns remaining messages after consuming one, or -1 if none left.
create or replace function public.check_and_increment_usage(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  free_daily_messages constant int := 5;
  current_count int;
  tier text;
begin
  select coalesce(e.tier, 'free') into tier from (select 1) s left join public.entitlements e on e.user_id = p_user;
  insert into public.usage_daily (user_id, date, message_count) values (p_user, current_date, 0)
    on conflict (user_id, date) do nothing;
  select message_count into current_count from public.usage_daily where user_id = p_user and date = current_date for update;
  if tier = 'free' and current_count >= free_daily_messages then
    return -1;
  end if;
  update public.usage_daily set message_count = message_count + 1 where user_id = p_user and date = current_date;
  if tier = 'free' then
    return free_daily_messages - current_count - 1;
  end if;
  return 999;
end $$;
revoke all on function public.check_and_increment_usage(uuid) from public;
grant execute on function public.check_and_increment_usage(uuid) to service_role;

-- Today's quote or a fallback in the user's language.
create or replace function public.today_quote(p_user uuid)
returns table (text text, theme text, is_fallback boolean)
language sql security definer set search_path = public volatile as $$
  select * from (
    select q.text, q.theme, false as is_fallback from public.daily_quotes q where q.user_id = p_user and p_user = auth.uid() and q.for_date = current_date
    union all
    select f.text, f.theme, true as is_fallback from public.quote_fallbacks f
      join public.profiles p on p.user_id = p_user and p_user = auth.uid() and p.language = f.language
      where not exists (select 1 from public.daily_quotes q where q.user_id = p_user and q.for_date = current_date)
  ) t
  order by is_fallback, random() limit 1;
$$;
grant execute on function public.today_quote(uuid) to authenticated;
