alter table companies
  add column if not exists soft_deleted boolean not null default false;
