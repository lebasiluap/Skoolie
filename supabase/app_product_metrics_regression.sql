-- All fixtures/config changes roll back. No user activity or rewards persist.
begin;
set local statement_timeout='8s';
do $test$
declare uid uuid; sid uuid:=gen_random_uuid(); sid2 uuid:=gen_random_uuid(); rowdata jsonb; before_n numeric; after_n numeric; rejected boolean; other_uid uuid;
begin
 select u.id into uid from auth.users u where lower(u.email)<>'lebasiluap@gmail.com' and not exists(select 1 from app_private.beta_tester_assignments a where a.email=lower(u.email)) order by u.created_at limit 1;
 if uid is null then raise exception 'Missing non-beta fixture account';end if;
 select id into other_uid from auth.users where id<>uid limit 1;
 insert into app_private.beta_activity_sessions(id,user_id,platform,version,build,started_at,last_seen_at)
 values(sid,uid,'ios','1.0.0','metrics-test',clock_timestamp()-interval '60 seconds',clock_timestamp());
 rowdata:='[{"screen":"mcq","recent_ms":60000,"quiet_ms":0,"idle_ms":0,"views":1,"touches":2,"answers":1,"flips":0,"completions":0}]'::jsonb;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform public.record_app_metrics(sid,1,rowdata);
 if exists(select 1 from app_private.app_usage_cursors where session_id=sid) then raise exception 'Disabled kill switch accepted metrics';end if;
 update app_private.app_metrics_control set enabled=true;
 perform set_config('request.jwt.claim.sub','',true);
 rejected:=false;begin perform public.record_app_metrics(sid,1,rowdata);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Signed-out submission accepted';end if;
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 rejected:=false;begin perform public.record_app_metrics(sid,1,rowdata);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Wrong owner accepted';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform public.record_app_metrics(sid,1,rowdata);
 select sum(recent_seconds) into before_n from app_private.app_usage_daily where user_id=uid and build='metrics-test';
 if before_n<>60 then raise exception 'Positive non-beta path failed %',before_n;end if;
 if not exists(select 1 from app_private.app_usage_daily where user_id=uid and build='metrics-test' and activity_date=(clock_timestamp() at time zone 'UTC')::date and platform='ios') then raise exception 'Server binding missing';end if;
 perform public.record_app_metrics(sid,1,rowdata);
 select sum(recent_seconds) into after_n from app_private.app_usage_daily where user_id=uid and build='metrics-test';
 if after_n<>before_n then raise exception 'Replay counted twice';end if;
 rejected:=false;begin perform public.record_app_metrics(sid,2,jsonb_build_array(rowdata->0||'{"content":"forbidden"}'::jsonb));exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Extra field accepted';end if;
 rejected:=false;begin perform public.record_app_metrics(sid,2,rowdata||rowdata);exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Duplicate screen accepted';end if;
 rejected:=false;begin perform public.record_app_metrics(sid,2,jsonb_set(rowdata,'{0,touches}','1001'));exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Excessive counter accepted';end if;
 rejected:=false;begin perform public.record_app_metrics(sid,2,jsonb_set(rowdata,'{0,screen}','"private-route-id"'));exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Unknown screen accepted';end if;
 update app_private.app_usage_cursors set last_received_at=clock_timestamp()-interval '6 seconds' where session_id=sid;
 update app_private.beta_activity_sessions set ended_at=clock_timestamp()-interval '1 second',last_seen_at=clock_timestamp(),end_reason='background' where id=sid;
 perform public.record_app_metrics(sid,2,jsonb_set(rowdata,'{0,recent_ms}','6000'));
 select sum(recent_seconds) into after_n from app_private.app_usage_daily where user_id=uid and build='metrics-test';
 if abs(after_n-before_n-6)>0.05 then raise exception 'Short final batch lost %',after_n;end if;
 update app_private.app_usage_cursors set last_received_at=clock_timestamp()-interval '200 seconds' where session_id=sid;
 perform public.record_app_metrics(sid,3,rowdata);
 if (select sum(recent_seconds) from app_private.app_usage_daily where user_id=uid and build='metrics-test')<>after_n then raise exception 'Suspension gap credited';end if;
 insert into app_private.beta_activity_sessions(id,user_id,platform,version,build,started_at,last_seen_at)
 values(sid2,uid,'ios','1.0.0','metrics-test',clock_timestamp()-interval '30 seconds',clock_timestamp());
 perform public.record_app_metrics(sid2,1,jsonb_set(rowdata,'{0,recent_ms}','30000'));
 if abs((select sum(recent_seconds) from app_private.app_usage_daily where user_id=uid and build='metrics-test')-after_n-30)>0.05 then raise exception 'Independent session aggregate overwrote previous values';end if;
 if has_table_privilege('authenticated','app_private.app_usage_daily','SELECT') or has_table_privilege('anon','app_private.app_usage_daily','SELECT') then raise exception 'Private metrics exposed';end if;
 if has_function_privilege('anon','public.record_app_metrics(uuid,integer,jsonb)','EXECUTE') then raise exception 'Anonymous endpoint exposed';end if;
 rejected:=false;begin perform public.admin_app_metrics(7);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Non-admin report access';end if;
 -- More than one cleanup chunk, all rollback-only fixtures.
 insert into app_private.app_usage_daily(user_id,activity_date,platform,version,build,screen)
 select uid,(clock_timestamp() at time zone 'UTC')::date-40,'ios','test','cleanup-'||n,'mcq' from generate_series(1,1100) n;
 perform app_private.purge_app_metrics();
 if exists(select 1 from app_private.app_usage_daily where user_id=uid and build like 'cleanup-%') then raise exception 'Cleanup stopped after one chunk';end if;
 if not exists(select 1 from app_private.app_usage_daily where user_id=uid and build='metrics-test') then raise exception 'Cleanup removed current data';end if;
 raise notice 'PASS: disabled switch, auth/owner binding, non-beta insertion, replay, payload, short end, unknown gaps, private access, admin guard and multi-chunk retention';
end $test$;
rollback;
