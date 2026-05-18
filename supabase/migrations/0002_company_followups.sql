-- Add follow-up 2 and 3 date columns to companies
alter table companies
  add column if not exists follow_up_2_date date,
  add column if not exists follow_up_3_date date;
