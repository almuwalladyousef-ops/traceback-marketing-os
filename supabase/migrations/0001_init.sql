-- ============================================================
-- Traceback Marketing OS — full schema
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Enums ───────────────────────────────────────────────────

create type company_status as enum (
  'Not Started', 'In Progress', 'Replied', 'In Conversation', 'Dead'
);

create type influencer_platform as enum ('IG', 'X');

create type influencer_status as enum ('Active', 'Archived', 'Deleted');

create type personal_status as enum ('Active', 'Archived', 'Dead');

create type content_scope as enum ('personal', 'traceback');

create type content_kind as enum ('long_form', 'short_form', 'blogs');

create type content_status as enum (
  'Idea', 'Outline', 'Script Draft', 'Script Final',
  'Filming', 'Editing', 'Published'
);

-- ── Email Outreach ───────────────────────────────────────────

create table companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  url            text,
  industry       text,
  outreach_date  date,
  follow_up_date date,
  status         company_status not null default 'Not Started',
  reply_notes    text,
  archived       boolean not null default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create trigger trg_companies_updated
  before update on companies
  for each row execute function set_updated_at();

create table contacts (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  name           text not null,
  role           text,
  email          text,
  x_handle       text,
  linkedin_url   text,
  phone          text,
  email_copy_used text,
  dm_copy_used   text,
  archived       boolean not null default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index idx_contacts_company on contacts(company_id);

create trigger trg_contacts_updated
  before update on contacts
  for each row execute function set_updated_at();

-- ── Influencer Outreach ──────────────────────────────────────

create table influencers (
  id           uuid primary key default gen_random_uuid(),
  link         text not null,
  platform     influencer_platform not null,
  touch_1      boolean not null default false,
  touch_2      boolean not null default false,
  touch_3      boolean not null default false,
  touch_1_date date,
  touch_2_date date,
  touch_3_date date,
  status       influencer_status not null default 'Active',
  archive_date date,
  cycle_count  smallint not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger trg_influencers_updated
  before update on influencers
  for each row execute function set_updated_at();

-- ── Personal Outreach ────────────────────────────────────────

create table personal_leads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  handle_or_url  text,
  phone          text,
  email          text,
  where_found    text,
  date_found     date,
  follow_up_date date,
  status         personal_status not null default 'Active',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create trigger trg_personal_leads_updated
  before update on personal_leads
  for each row execute function set_updated_at();

-- ── Content ──────────────────────────────────────────────────

create table content_pieces (
  id                   uuid primary key default gen_random_uuid(),
  scope                content_scope not null,
  kind                 content_kind not null,
  title                text not null,
  inspiration_link     text,
  status               content_status not null default 'Idea',
  notes                text,
  finish_link          text,
  publish_date         date,
  about                text,
  copy                 text,
  visual_url           text,
  todo_draft_copy      boolean not null default false,
  todo_create_visual   boolean not null default false,
  todo_schedule_post   boolean not null default false,
  todo_publish_post    boolean not null default false,
  archived             boolean not null default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index idx_content_pieces_scope_kind_status
  on content_pieces(scope, kind, status);

create trigger trg_content_pieces_updated
  before update on content_pieces
  for each row execute function set_updated_at();

create table content_analysis (
  id                uuid primary key default gen_random_uuid(),
  scope             content_scope not null,
  content_piece_id  uuid references content_pieces(id) on delete set null,
  what_worked       text,
  what_didnt        text,
  key_lesson        text,
  apply_to_next     text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_content_analysis_scope on content_analysis(scope);

create trigger trg_content_analysis_updated
  before update on content_analysis
  for each row execute function set_updated_at();

-- ── Comment Hacking ──────────────────────────────────────────

create table comment_logs (
  id         uuid primary key default gen_random_uuid(),
  log_date   date not null unique,
  count      integer not null check (count >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_comment_logs_date on comment_logs(log_date);

create trigger trg_comment_logs_updated
  before update on comment_logs
  for each row execute function set_updated_at();

-- ── RLS: allow anon SELECT, block anon writes ────────────────
-- Service role bypasses RLS, so server actions still work.

alter table companies        enable row level security;
alter table contacts         enable row level security;
alter table influencers      enable row level security;
alter table personal_leads   enable row level security;
alter table content_pieces   enable row level security;
alter table content_analysis enable row level security;
alter table comment_logs     enable row level security;

create policy "anon_read_companies"        on companies        for select to anon using (true);
create policy "anon_read_contacts"         on contacts         for select to anon using (true);
create policy "anon_read_influencers"      on influencers      for select to anon using (true);
create policy "anon_read_personal_leads"   on personal_leads   for select to anon using (true);
create policy "anon_read_content_pieces"   on content_pieces   for select to anon using (true);
create policy "anon_read_content_analysis" on content_analysis for select to anon using (true);
create policy "anon_read_comment_logs"     on comment_logs     for select to anon using (true);
