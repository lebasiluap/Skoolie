-- Always execute inside BEGIN/ROLLBACK. Never commit these fixtures.
do $test$
declare uid uuid; p public.user_profiles%rowtype; result jsonb; credited integer;
 balance integer; n integer; today date:=(clock_timestamp() at time zone 'UTC')::date;
 previous_week date:=(date_trunc('week',now())-interval '7 days')::date;
begin
 select id into uid from public.user_profiles where id not in (
  select user_id from app_private.verified_sessions where completed_at is not null)
 order by created_at limit 1;
 if uid is null then raise exception 'No isolated fixture';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 if exists(select 1 from public.user_profiles where streak_freezes not between 0 and 2) then raise exception 'Uncapped balance';end if;
 if exists(select 1 from app_private.freeze_cap_adjustments where old_balance-removed<>2 or removed<=0) then raise exception 'Bad trim evidence';end if;

 -- Overflow backstop preserves other reward fields rather than aborting XP.
 select * into p from public.user_profiles where id=uid;
 update public.user_profiles set xp=xp+1,streak_freezes=99 where id=uid;
 if not exists(select 1 from public.user_profiles where id=uid and xp=p.xp+1 and streak_freezes=2) then raise exception 'Overflow lost reward';end if;
 if not exists(select 1 from app_private.freeze_cap_clamps where user_id=uid and requested=99 and applied=2) then raise exception 'Clamp not recorded';end if;

 -- Consumption/refill sequence, not an IOU: 2 -> 1 -> 2 -> 2.
 delete from app_private.study_streak_days where user_id=uid;
 insert into app_private.study_streak_days values(uid,today-2,'study');
 perform app_private.reconcile_study_streak(uid);
 select * into p from public.user_profiles where id=uid;
 if p.streak_freezes<>1 or p.current_streak<>1 then raise exception 'Freeze consumption added a day or failed';end if;
 if app_private.grant_streak_freezes(uid,1)<>1 then raise exception 'Refill failed';end if;
 if app_private.grant_streak_freezes(uid,3)<>0 then raise exception 'Full-bank grant credited';end if;
 if (select streak_freezes from public.user_profiles where id=uid)<>2 then raise exception 'Refill exceeds cap';end if;
 perform app_private.reconcile_study_streak(uid);
 if (select streak_freezes from public.user_profiles where id=uid)<>2 then raise exception 'Replayed consume';end if;

 -- Actual credits from empty/partly full/full banks, including all trophy
 -- return rows. Trophy claims remain one-time even after a slot opens.
 for balance in 0..2 loop
  -- Prequalify every level trophy so XP from the first award cannot unlock
  -- a genuinely new level trophy during the replay assertion.
  update public.user_profiles set streak_freezes=balance,current_streak=365,longest_streak=365,xp=40000,level=101 where id=uid;
  delete from public.user_trophies where user_id=uid;
  result:=public.check_trophies();
  select coalesce(sum((e->>'reward_freezes')::int),0) into credited from jsonb_array_elements(result) e;
  if credited<>2-balance then raise exception 'Trophy response not actual: %, %',balance,result;end if;
  if (select streak_freezes from public.user_profiles where id=uid)<>2 then raise exception 'Trophy cap failed';end if;
  update public.user_profiles set streak_freezes=1 where id=uid;
  result:=public.check_trophies();
  if result<>'[]'::jsonb or (select streak_freezes from public.user_profiles where id=uid)<>1 then raise exception 'Trophy replay refilled: %',result;end if;
 end loop;

 -- Exactly two one-freeze trophies: the function aggregates all new awards,
 -- not only the last trophy. Other eligible trophies carry zero freezes.
 update public.trophies set reward_freezes=case when id in ('streak_3','streak_7') then 1 else 0 end;
 delete from public.user_trophies where user_id=uid;
 update public.user_profiles set streak_freezes=0,current_streak=7,longest_streak=7 where id=uid;
 result:=public.check_trophies();
 select count(*) into n from jsonb_array_elements(result) e
 where e->>'id' in ('streak_3','streak_7') and (e->>'reward_freezes')::int=1;
 if n<>2 or (select streak_freezes from public.user_profiles where id=uid)<>2 then raise exception 'Two-trophy allocation failed: %',result;end if;

 -- Fifth-barrage source retains exactly-once claim and XP at capacity.
 for balance in 0..2 loop
  delete from public.barrage_claims where user_id=uid;
  insert into public.barrage_claims(user_id,day,slot) select uid,current_date-100-i,0 from generate_series(1,4) i;
  update public.user_profiles set streak_freezes=balance where id=uid;
  n:=public.credit_xp('barrage',5,5,false,0,0);
  if n<=0 or (select streak_freezes from public.user_profiles where id=uid)<>least(2,balance+1) then raise exception 'Barrage award failed';end if;
  update public.user_profiles set streak_freezes=0 where id=uid;
  n:=public.credit_xp('barrage',5,5,false,0,0);
  if n<>0 or (select streak_freezes from public.user_profiles where id=uid)<>0 then raise exception 'Barrage replay refilled';end if;
 end loop;

 -- Podium results and historical reward record reflect actual credits.
 insert into public.league_standings(user_id,week_start,league,week_xp)
 values(uid,previous_week,'bronze',2000000000)
 on conflict(user_id,week_start) do update set week_xp=excluded.week_xp,league='bronze';
 for balance in 0..2 loop
  delete from public.week_rewards where user_id=uid and week_start=previous_week;
  update public.user_profiles set streak_freezes=balance where id=uid;
  result:=public.get_week_result();
  if (result->>'reward_freezes')::int<>2-balance then raise exception 'Podium result overclaimed: %',result;end if;
  if (select freezes from public.week_rewards where user_id=uid and week_start=previous_week)<>2-balance then raise exception 'Podium record overclaimed';end if;
  update public.user_profiles set streak_freezes=0 where id=uid;
  result:=public.get_week_result();
  if (result->>'reward_freezes')::int<>0 or (select streak_freezes from public.user_profiles where id=uid)<>0 then raise exception 'Podium replay refilled';end if;
 end loop;

 -- Existing client guard must reject even a plausible +1. Helper/table stay
 -- private; owning an account is not authorization to manufacture a freeze.
 perform set_config('role','authenticated',true);
 result:=public.get_study_streak();
 if (result->>'freeze_capacity')::int<>2 or not result ? 'freeze_cap_adjusted' then raise exception 'Missing safe capacity projection';end if;
 begin
  update public.user_profiles set streak_freezes=1 where id=uid;
  raise exception 'Client grant accepted';
 exception when insufficient_privilege or invalid_parameter_value then null;
 end;
 begin perform app_private.grant_streak_freezes(uid,1);raise exception 'Private helper exposed';
 exception when insufficient_privilege then null;end;
 begin perform 1 from app_private.freeze_cap_adjustments;raise exception 'Private trim record exposed';
 exception when insufficient_privilege then null;end;
 -- Sign-in/profile reads and normal preferences remain available.
 select count(*) into n from public.user_profiles where id=uid;
 if n<>1 then raise exception 'Own profile blocked';end if;
 update public.user_profiles set sound_enabled=sound_enabled where id=uid;
 perform set_config('role','postgres',true);
end $test$;
select 'PASS: cap, refill, consumption, overflow XP, trophy/barrage/podium actual credits, replay and profile guards; fixtures rolled back' as result;
