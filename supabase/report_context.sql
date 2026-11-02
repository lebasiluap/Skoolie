-- Additive report diagnostics. No reward, Auth or quarantine changes.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
alter table public.question_reports
  add column if not exists platform text check(platform is null or platform in ('ios','android','web','unknown')),
  add column if not exists app_version text check(app_version is null or char_length(app_version)<=80),
  add column if not exists app_build text check(app_build is null or char_length(app_build)<=80),
  add column if not exists os_version text check(os_version is null or char_length(os_version)<=80),
  add column if not exists app_screen text check(app_screen is null or app_screen in ('dashboard','practice','mcq','flashcards','rapid-fire','cases','progress','insights','leaderboard','profile','settings','history','bookmarks','other','unknown'));
comment on column public.question_reports.app_build is 'Client-reported native build label at submission; unknown for legacy reports. Not authorization or verified device identity.';
commit;

