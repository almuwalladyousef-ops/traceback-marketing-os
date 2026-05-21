-- Add breakup email date and decouple archive tracking from bump 3
alter table companies
  add column if not exists follow_up_4_date date,
  add column if not exists archive_date date;

-- Migrate: follow_up_3_date was previously used as the archive timestamp.
-- Move those values to archive_date and clear follow_up_3_date for archived rows.
update companies
  set archive_date = follow_up_3_date, follow_up_3_date = null
  where archived = true and follow_up_3_date is not null;
