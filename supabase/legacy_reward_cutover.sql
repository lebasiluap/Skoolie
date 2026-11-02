-- RELEASE GATE: do not apply before web verified flow and supported native builds
-- are released and legacy course/duel callers are migrated or disabled.
-- This file remains pending, not evidence of an applied security fix.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
revoke execute on function public.credit_xp(text,integer,integer,boolean,integer,integer) from public,anon,authenticated;
revoke execute on function public.record_answer(uuid,text,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke insert,update,delete on public.quiz_sessions from public,anon,authenticated;
revoke insert,update on public.user_question_history from public,anon,authenticated;
commit;

