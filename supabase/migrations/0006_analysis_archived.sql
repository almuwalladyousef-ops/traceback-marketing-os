alter table content_analysis add column archived boolean not null default false;
create index idx_content_analysis_archived on content_analysis(archived);
