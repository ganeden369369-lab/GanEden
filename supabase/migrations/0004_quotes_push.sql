-- Phase 3, Task 2: widen content_meanings for personal day/month cycle
-- meanings + seed draft copy; push_log (idempotent push send-tracking);
-- future_quote_count() helper; push-daily cron scaffold (commented, for
-- the hosted project in Phase 5 — see R1 in the phase-3 plan).

-- ---------- content_meanings: widen number_type ----------
alter table public.content_meanings drop constraint content_meanings_number_type_check;
alter table public.content_meanings add constraint content_meanings_number_type_check
  check (number_type in ('life_path','expression','soul_urge','personality','birthday','personal_day','personal_month'));

-- Draft cycle meanings (R2): 1-9 x {personal_day, personal_month} x {en, he}, unapproved.
insert into public.content_meanings (number_type, value, language, title, body, approved) values
('personal_day', 1, 'en', 'New Beginnings', 'Today favors bold first steps — trust the spark that wants to start something new.', false),
('personal_day', 1, 'he', 'התחלה חדשה', 'היום מזמין אותך לצעד ראשון נועז — תני אמון בניצוץ שרוצה להתחיל משהו.', false),
('personal_day', 2, 'en', 'Slow and Together', 'Today asks for patience and partnership — let someone else lead for a moment.', false),
('personal_day', 2, 'he', 'בשקט ויחד', 'היום מבקש סבלנות ושותפות — תני למישהי אחרת להוביל לרגע.', false),
('personal_day', 3, 'en', 'Speak and Shine', 'Today wants your voice heard — say the thing, share the joy.', false),
('personal_day', 3, 'he', 'לדבר ולזרוח', 'היום רוצה לשמוע את הקול שלך — תגידי את זה, תשתפי את השמחה.', false),
('personal_day', 4, 'en', 'Steady Hands', 'Today rewards steady, practical effort — build one solid thing at a time.', false),
('personal_day', 4, 'he', 'ידיים יציבות', 'היום מתגמל מאמץ יציב ומעשי — בני דבר אחד מוצק בכל פעם.', false),
('personal_day', 5, 'en', 'Wind of Change', 'Today brings movement and change — say yes to what shakes things up gently.', false),
('personal_day', 5, 'he', 'רוח של שינוי', 'היום מביא תנועה ושינוי — הגידי כן למה שמערער אותך בעדינות.', false),
('personal_day', 6, 'en', 'Home and Heart', 'Today calls you toward the people you love — show up for them, and for yourself.', false),
('personal_day', 6, 'he', 'בית ולב', 'היום קורא לך אל האנשים שאת אוהבת — היי שם בשבילם, וגם בשבילך.', false),
('personal_day', 7, 'en', 'Quiet Depths', 'Today is for quiet and reflection — give yourself space to just listen inward.', false),
('personal_day', 7, 'he', 'עומק שקט', 'היום הוא לשקט ולהתבוננות — תני לעצמך מקום פשוט להקשיב פנימה.', false),
('personal_day', 8, 'en', 'Bold Momentum', 'Today has real momentum behind it — claim your power and move with purpose.', false),
('personal_day', 8, 'he', 'תנופה נועזת', 'ליום הזה יש תנופה אמיתית מאחוריו — תבעי את הכוח שלך ותזוזי במטרה.', false),
('personal_day', 9, 'en', 'Letting Go', 'Today asks you to release what''s finished and make room for what''s next.', false),
('personal_day', 9, 'he', 'לשחרר', 'היום מבקש ממך לשחרר את מה שהסתיים ולפנות מקום למה שבא.', false),
('personal_month', 1, 'en', 'A New Chapter', 'This month opens a new chapter — plant a seed you actually want to grow.', false),
('personal_month', 1, 'he', 'פרק חדש', 'החודש הזה פותח פרק חדש — שתלי זרע שאת באמת רוצה שיצמח.', false),
('personal_month', 2, 'en', 'Together and Steady', 'This month is about connection — slow down and let a relationship deepen.', false),
('personal_month', 2, 'he', 'יחד ולאט', 'החודש הזה הוא על חיבור — האטי ותני לקשר להעמיק.', false),
('personal_month', 3, 'en', 'Creative Light', 'This month invites more color into your life — create, express, be seen.', false),
('personal_month', 3, 'he', 'אור יצירתי', 'החודש הזה מזמין עוד צבע לחיים שלך — צרי, בטאי, תני לראות אותך.', false),
('personal_month', 4, 'en', 'Solid Ground', 'This month rewards discipline — lay the groundwork for something lasting.', false),
('personal_month', 4, 'he', 'קרקע יציבה', 'החודש הזה מתגמל משמעת — הניחי יסודות למשהו שיחזיק מעמד.', false),
('personal_month', 5, 'en', 'Room to Roam', 'This month brings freedom and unexpected turns — stay light on your feet.', false),
('personal_month', 5, 'he', 'מרחב לנוע', 'החודש הזה מביא חופש ותפניות בלתי צפויות — הישארי קלילה על הרגליים.', false),
('personal_month', 6, 'en', 'Home and Heart', 'This month centers home and love — tend to the people and space around you.', false),
('personal_month', 6, 'he', 'בית ולב', 'החודש הזה מרכז בית ואהבה — טפחי את האנשים והמרחב סביבך.', false),
('personal_month', 7, 'en', 'Turning Inward', 'This month is for going inward — trust what you learn when you slow down.', false),
('personal_month', 7, 'he', 'פנייה פנימה', 'החודש הזה הוא להיכנס פנימה — תני אמון במה שאת לומדת כשאת מאטה.', false),
('personal_month', 8, 'en', 'Bold Ambition', 'This month puts your ambition in focus — take the step you''ve been circling.', false),
('personal_month', 8, 'he', 'שאפתנות נועזת', 'החודש הזה שם את השאיפה שלך במרכז — עשי את הצעד שסביבו את מסתובבת.', false),
('personal_month', 9, 'en', 'Full Circle', 'This month is for closing a loop — let go of what no longer fits so you can receive what''s next.', false),
('personal_month', 9, 'he', 'מעגל שנסגר', 'החודש הזה הוא לסגור מעגל — שחררי את מה שכבר לא מתאים כדי לקבל את מה שבא.', false);

-- ---------- push_log ----------
-- Idempotent per-user-per-day send tracking for push-daily (P1 §Push).
-- Service-role only: RLS is enabled with no policies, matching
-- spend_daily/prompt_versions.
create table public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.push_log enable row level security; -- service role only

-- ---------- future_quote_count ----------
-- How many of the caller's own daily_quotes rows are still ahead of today —
-- the app calls this to decide when to top up (< 7 remaining, per the
-- phase-3 plan's Quote batch rule).
create or replace function public.future_quote_count(p_user uuid)
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from public.daily_quotes where user_id = p_user and p_user = auth.uid() and for_date >= current_date
$$;
revoke all on function public.future_quote_count(uuid) from public;
grant execute on function public.future_quote_count(uuid) to authenticated;

-- ---------- push-daily cron (R1: enable on the hosted project in Phase 5) ----------
-- Locally (and in CI), quote generation/top-up and push are triggered by
-- the app itself — there is no local pg_cron/pg_net dependency. This block
-- is the intended hosted-project schedule for `push-daily`: uncomment once
-- this migration runs against the hosted Supabase project, with pg_cron
-- and pg_net enabled and the URL/bearer filled in for that project.
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'push-daily',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url := '<hosted-project-url>/functions/v1/push-daily',
--     headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
