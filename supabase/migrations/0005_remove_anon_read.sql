-- Remove open anon SELECT policies from all tables.
-- The service role (used by all server actions) bypasses RLS entirely,
-- so server-side reads continue to work without these policies.
-- Direct REST API access using the anon key is now blocked on all tables.

drop policy if exists "anon_read_companies"        on companies;
drop policy if exists "anon_read_contacts"         on contacts;
drop policy if exists "anon_read_influencers"      on influencers;
drop policy if exists "anon_read_personal_leads"   on personal_leads;
drop policy if exists "anon_read_content_pieces"   on content_pieces;
drop policy if exists "anon_read_content_analysis" on content_analysis;
drop policy if exists "anon_read_comment_logs"     on comment_logs;
