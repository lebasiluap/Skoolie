-- Preserve the public result row backing a private reward receipt. Existing
-- legacy session rows are unaffected, and DELETE is not intercepted so account
-- deletion cascades can remove all owned rows together through their FKs.
set lock_timeout='2s';
create function app_private.protect_verified_quiz_row() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if current_setting('role',true) in ('anon','authenticated')
    and exists(select 1 from app_private.reward_receipts where quiz_session_id=old.id) then
   raise exception 'Verified results cannot be edited directly' using errcode='42501';
 end if;
 return new;
end $fn$;
revoke all on function app_private.protect_verified_quiz_row() from public,anon,authenticated;
create trigger protect_verified_quiz_row before update on public.quiz_sessions
for each row execute function app_private.protect_verified_quiz_row();
