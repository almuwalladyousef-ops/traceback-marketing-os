alter table content_pieces
  add column if not exists user_archived boolean not null default false;
