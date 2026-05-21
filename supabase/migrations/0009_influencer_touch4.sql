-- Add Close (touch 4) to influencer outreach sequence
alter table influencers
  add column if not exists touch_4 boolean not null default false,
  add column if not exists touch_4_date date;
