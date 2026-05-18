alter table personal_leads
  add column if not exists date_contacted date,
  add column if not exists notes text;

alter table influencers
  add column if not exists replied boolean not null default false,
  add column if not exists notes text;
