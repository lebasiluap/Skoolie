begin;
set local statement_timeout='15s';
do $test$
declare u uuid;prof text;ids text[];issued jsonb;sid uuid;ans jsonb;reply jsonb;result jsonb;item text;key text;blocked boolean;paid integer; request uuid:=gen_random_uuid();
begin
 for u in select p.id from public.user_profiles p where not exists(select 1 from public.barrage_claims b where b.user_id=p.id and b.day=current_date and b.slot=0) loop
  perform set_config('request.jwt.claim.sub',u::text,true);exit when not public.is_admin();
 end loop;
 select profession into prof from public.user_profiles where id=u;
 select array_agg(id::text) into ids from (select id from public.questions where question_type in('rapid_fire','mcq') and professions @>array[prof]
  and public.region_visible(region) and access_key is null and correct_answer ~ '^[A-D]$' order by (question_type='rapid_fire') desc limit 5)q;
 if cardinality(ids)<>5 then raise exception 'Missing rapid fixtures';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 set local role authenticated;
 issued:=public.begin_verified_rapid_session(request,'rapid_fire',ids,false,0);sid:=(issued->>'session_id')::uuid;
 if issued<>public.begin_verified_rapid_session(request,'rapid_fire',ids,false,0) then raise exception 'Rapid issuance replay failed';end if;
 if issued->>'mode'<>'rapid_fire' then raise exception 'Incorrect rapid mode';end if;
 foreach item in array ids loop
  perform public.open_verified_timed_item(sid,item);
  reset role;
  select snapshot->item->>'key' into key from app_private.verified_sessions where id=sid;
  set local role authenticated;
  reply:=public.answer_verified_timed_item(sid,item,key);
 end loop;
 reset role;
 select timed_answers into ans from app_private.verified_sessions where id=sid;
 set local role authenticated;
 result:=public.finish_verified_session(sid,ans);
 if (result->>'score')::integer<>5 or result<>public.finish_verified_session(sid,ans) then raise exception 'Rapid grade/replay failed';end if;
 reset role;
 if not exists(select 1 from app_private.verified_sessions where id=sid and rapid_bonus=25) then raise exception 'Rapid bonus not capped';end if;
 set local role authenticated;
 issued:=public.begin_verified_rapid_session(gen_random_uuid(),'rapid_fire',array[ids[1]],true,0);sid:=(issued->>'session_id')::uuid;
 perform public.open_verified_timed_item(sid,ids[1]);
 reset role;
 select snapshot->ids[1]->>'key' into key from app_private.verified_sessions where id=sid;
 set local role authenticated;
 perform public.answer_verified_timed_item(sid,ids[1],key);
 result:=public.finish_verified_session(sid,jsonb_build_object(ids[1],key));
 if result<>public.finish_verified_session(sid,jsonb_build_object(ids[1],key)) then raise exception 'Barrage replay failed';end if;
 blocked:=false;begin perform public.begin_verified_rapid_session(gen_random_uuid(),'rapid_fire',array[ids[1]],true,0);exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Completed barrage slot reissued';end if;
 reset role;
 select count(*) into paid from public.barrage_claims where user_id=u and day=current_date and slot=0;
 if paid<>1 then raise exception 'Duplicate barrage claim';end if;
 if not exists(select 1 from public.quiz_sessions where id=(result->>'quiz_session_id')::uuid and mode='barrage' and timed) then raise exception 'Barrage mode not saved';end if;
end $test$;
select 'PASS: released rapid/MCQ payloads, server-timed answers, server-computed capped bonus, atomic rapid result, unique barrage slot and replay; ALL rolled back' result;
rollback;
