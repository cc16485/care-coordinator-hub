-- ============================================================
-- COVERAGE OUTREACH - the automation bridge for Coverage Help
-- Paste into Supabase SQL editor (shared project zngsgedlsxinbygwmxwn)
-- AFTER creating the GHL workflow and pasting its webhook URL below.
--
-- Same three patterns as the site-leads bridge, deliberately:
--   * pg_net fires the GHL webhook SERVER-side, so the URL never
--     appears in client JavaScript
--   * the trigger is exception-wrapped, so a webhook failure can
--     never lose the outreach row itself
--   * replies come back through an INSERT-only table, so the GHL
--     workflow can write results without any power to read or edit
-- ============================================================

-- >>>>>> PASTE THE WORKFLOW'S INBOUND WEBHOOK URL HERE <<<<<<
-- (Workflow trigger: Inbound Webhook -> copy URL)
-- Example: https://services.leadconnectorhq.com/hooks/XXXX/webhook-trigger/YYYY


-- 1. Outgoing asks. The hub inserts one row per caregiver per case.
create table if not exists coverage_outreach (
  id            uuid primary key default gen_random_uuid(),
  case_id       text not null,           -- coverage_cases item id
  client_name   text not null,           -- whose shift (first name + initial is enough)
  shift_text    text not null,           -- human sentence: "Fri Aug 1, 10a-6p, Springfield"
  caregiver     text not null,
  phone         text not null,
  channel       text not null default 'sms',   -- sms | voice
  requested_by  text,
  requested_at  timestamptz not null default now(),
  webhook_sent  boolean not null default false
);
alter table coverage_outreach enable row level security;
-- authenticated hub users insert and read; nothing for anon
create policy cov_outreach_rw on coverage_outreach
  for all to authenticated using (true) with check (true);

-- 2. Replies. ONLY GHL writes here, via the anon key, INSERT only.
create table if not exists coverage_replies (
  id          uuid primary key default gen_random_uuid(),
  case_id     text not null,
  phone       text not null,
  caregiver   text,
  answer      text not null,             -- yes | no | unclear | no_answer | voicemail
  raw_reply   text,                      -- what they actually said, verbatim
  via         text default 'sms',        -- sms | voice
  at          timestamptz not null default now()
);
alter table coverage_replies enable row level security;
create policy cov_replies_anon_insert on coverage_replies
  for insert to anon with check (true);
create policy cov_replies_read on coverage_replies
  for select to authenticated using (true);
-- NOTE: also grant at the table level - RLS and GRANTs are two separate gates:
grant insert on coverage_replies to anon;
grant select, insert on coverage_outreach to authenticated;
grant select on coverage_replies to authenticated;

-- 3. The trigger: each new outreach row -> one GHL webhook call.
create or replace function notify_coverage_outreach() returns trigger
language plpgsql security definer as $$
declare
  webhook_url text := 'PASTE_WEBHOOK_URL_HERE';
begin
  begin
    perform net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'outreach_id', new.id,
        'case_id',     new.case_id,
        'client_name', new.client_name,
        'shift_text',  new.shift_text,
        'caregiver',   new.caregiver,
        'phone',       new.phone,
        'channel',     new.channel
      )
    );
    new.webhook_sent := true;
  exception when others then
    -- webhook down must never block the insert; the hub shows
    -- webhook_sent=false so an unsent ask is visible, not silent
    new.webhook_sent := false;
  end;
  return new;
end $$;

drop trigger if exists trg_coverage_outreach on coverage_outreach;
create trigger trg_coverage_outreach
  before insert on coverage_outreach
  for each row execute function notify_coverage_outreach();

notify pgrst, 'reload schema';
