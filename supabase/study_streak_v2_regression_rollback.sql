-- Roll back every fixture. Use a real profile only inside this transaction.
do $test$
declare uid uuid; p public.user_profiles%rowtype; today date:=(clock_timestamp() at time zone 'UTC')::date;
 before_count integer; before_balance integer;
begin
 select profile_row.id into uid from public.user_profiles profile_row where not exists(
  select 1 from app_private.verified_sessions s where s.user_id=profile_row.id and s.completed_at is not null)
 order by profile_row.created_at limit 1;
 if uid is null then raise exception 'No fixture';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 -- Remove this user's ledger only in the enclosing rolled-back transaction.
 delete from app_private.study_streak_days where user_id=uid;
 -- Existing verified completions will be reimported. Isolate this fixture
 -- on historical days, away from existing recent completion days.
 insert into app_private.study_streak_days values(uid,today-3,'study');
 update public.user_profiles set streak_freezes=2 where id=uid;
 perform app_private.reconcile_study_streak(uid);
 select * into p from public.user_profiles where id=uid;
 -- A study today (if present) earns one; two freezes never earn days.
 select count(*) into before_count from app_private.study_streak_days
 where user_id=uid and kind='study' and day>=today-3;
 if p.current_streak<>before_count or p.streak_freezes<>0 then raise exception 'Freeze must preserve, not add days';end if;
 before_balance:=p.streak_freezes;
 perform app_private.reconcile_study_streak(uid);
 select * into p from public.user_profiles where id=uid;
 if p.current_streak<>before_count or p.streak_freezes<>before_balance then raise exception 'Replay consumed freeze/earned day';end if;
 -- Opening alone must never insert a study day.
 if (select count(*) from app_private.study_streak_days where user_id=uid and kind='study' and day>=today-3)<>before_count then raise exception 'Opening earned a day';end if;
 -- Direct authenticated changes must be rejected, including valid-looking +1.
 perform set_config('role','authenticated',true);
 begin
  update public.user_profiles set current_streak=1,longest_streak=greatest(longest_streak,1),last_active_date=today where id=uid;
  raise exception 'Direct streak write was accepted';
 exception when insufficient_privilege then null;
 end;
 perform set_config('role','postgres',true);
end $test$;
select 'PASS: freezes add zero, refresh/replay adds zero, authenticated direct writes denied; all fixtures rolled back' as result;
