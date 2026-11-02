-- Approval required. All fixtures and temporary permissions/columns roll back.
-- Known-outcome integration tests on released bank items. No medical review.
-- Every result, reward, quarantine fixture and content mutation is ROLLED BACK.
begin;
-- Reviewed client cutover: no content, Auth, serving or quarantine changes.
-- Old client reward writes fail closed; current verified sessions retain access
-- through the existing postgres-owned SECURITY DEFINER transaction.

set local lock_timeout='2s';
set local statement_timeout='10s';
alter table public.question_reports
  add column if not exists platform text check(platform is null or platform in ('ios','android','web','unknown')),
  add column if not exists app_version text check(app_version is null or char_length(app_version)<=80),
  add column if not exists app_build text check(app_build is null or char_length(app_build)<=80),
  add column if not exists os_version text check(os_version is null or char_length(os_version)<=80),
  add column if not exists app_screen text check(app_screen is null or app_screen in ('dashboard','practice','mcq','flashcards','rapid-fire','cases','progress','insights','leaderboard','profile','settings','history','bookmarks','other','unknown'));
comment on column public.question_reports.app_build is 'Client-reported native build label at submission; unknown for legacy reports. Not authorization or verified device identity.';
revoke execute on function public.credit_xp(text,integer,integer,boolean,integer,integer) from public,anon,authenticated;
revoke execute on function public.record_answer(uuid,text,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke insert,update,delete on public.quiz_sessions from public,anon,authenticated;
revoke insert,update on public.user_question_history from public,anon,authenticated;


set local statement_timeout='15s';
do $test$
declare
 uid uuid; other_uid uuid; prof text; qid uuid; fc uuid; case_id uuid;
 issued jsonb; receipt jsonb; replay jsonb; answers jsonb; sid uuid;
 request uuid; key text; wrong text; before_xp int; after_xp int; n int; blocked boolean; before_seen int;
begin
 for uid in select id from public.user_profiles loop
   perform set_config('request.jwt.claim.sub',uid::text,true);
   exit when not public.is_admin();
 end loop;
 select profession into prof from public.user_profiles where id=uid;
 select id into other_uid from public.user_profiles where id<>uid limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 select id into qid from public.questions where question_type='mcq' and professions @>array[prof]
   and public.region_visible(region) and access_key is null and correct_answer ~ '^[A-D]$' limit 1;
 select id into fc from public.questions where question_type='flashcard' and professions @>array[prof]
   and public.region_visible(region) and access_key is null limit 1;
 select id into case_id from public.case_studies where professions @>array[prof]
   and public.region_visible(region) and access_key is null and jsonb_array_length(questions)>0
   and questions->0->>'correct_answer' ~ '^[A-F]$' limit 1;
 if qid is null or fc is null or case_id is null or other_uid is null then raise exception 'Missing released fixtures'; end if;
 select xp into before_xp from public.user_profiles where id=uid;
 request:=gen_random_uuid();
 set local role authenticated;
 issued:=public.begin_verified_session(request,'mcq',array[qid::text]);
 if issued<>public.begin_verified_session(request,'mcq',array[qid::text]) then raise exception 'Start retry changed session'; end if;
 if issued ? 'snapshot' or issued ? 'key' then raise exception 'Private grading state exposed'; end if;
 sid:=(issued->>'session_id')::uuid;
 blocked:=false;
 begin perform public.begin_verified_session(request,'flashcard',array[fc::text]);
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Request ID reused with different configuration'; end if;
 blocked:=false;
 begin perform public.begin_verified_session(gen_random_uuid(),'mcq',array[qid::text,qid::text]);
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Duplicate items accepted'; end if;
 blocked:=false;
 begin perform public.finish_verified_session(sid,'{}');
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Missing answers accepted'; end if;
 blocked:=false;
 begin perform public.finish_verified_session(sid,jsonb_build_object(qid::text,'A','score',999));
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Extra client score accepted'; end if;
 blocked:=false;
 begin perform public.finish_verified_session(sid,jsonb_build_object(qid::text,'Z'));
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Invalid option accepted'; end if;
 reset role;
 select snapshot->qid::text->>'key' into key from app_private.verified_sessions where id=sid;
 answers:=jsonb_build_object(qid::text,key);
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 set local role authenticated;
 blocked:=false;
 begin perform public.finish_verified_session(sid,answers);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Wrong owner accepted'; end if;
 reset role;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 set local role authenticated;
 receipt:=public.finish_verified_session(sid,answers);
 replay:=public.finish_verified_session(sid,answers);
 if receipt<>replay or (receipt->>'score')::int<>1 then raise exception 'Correct grade/retry failed'; end if;
 wrong:=case when key='A' then 'B' else 'A' end;
 blocked:=false;
 begin perform public.finish_verified_session(sid,jsonb_build_object(qid::text,wrong));
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Completed answers changed'; end if;
 reset role;
 select xp into after_xp from public.user_profiles where id=uid;
 if after_xp-before_xp<>(receipt->>'xp')::int then raise exception 'Duplicate XP credited'; end if;
 select count(*) into n from app_private.reward_receipts where session_id=sid;
 if n<>1 then raise exception 'Receipt not unique'; end if;
 set local role authenticated;
  blocked:=false;
  begin update public.quiz_sessions set score=999 where id=(receipt->>'quiz_session_id')::uuid;
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Verified public result edited'; end if;
 blocked:=false;
 begin perform count(*) from app_private.reward_receipts;
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Private receipt table exposed'; end if;
 -- A genuine wrong answer is graded wrong, regardless of any local score.
 issued:=public.begin_verified_session(gen_random_uuid(),'mcq',array[qid::text]);
 replay:=public.finish_verified_session((issued->>'session_id')::uuid,jsonb_build_object(qid::text,wrong));
 if (replay->>'score')::int<>0 or (replay->>'xp')::int<>0 then raise exception 'Wrong answer paid correct-answer XP'; end if;
 reset role;
 select coalesce(max(times_seen),0) into before_seen from public.user_question_history where user_id=uid and question_id=fc;
 set local role authenticated;
 issued:=public.begin_verified_session(gen_random_uuid(),'flashcard',array[fc::text]);
 replay:=public.finish_verified_session((issued->>'session_id')::uuid,jsonb_build_object(fc::text,true));
 if (replay->>'score')::int<>1 or (replay->>'xp')::int<>0 then raise exception 'Flashcard reward policy failed'; end if;
 perform public.finish_verified_session((issued->>'session_id')::uuid,jsonb_build_object(fc::text,true));
 reset role;
 select times_seen into n from public.user_question_history where user_id=uid and question_id=fc;
 if n is distinct from before_seen+1 then raise exception 'Flashcard history not recorded exactly once'; end if;
 set local role authenticated;
 issued:=public.begin_verified_session(gen_random_uuid(),'case_study',array[case_id::text||':0']);
 if issued->'items'->0->'case_context'->>'id' is distinct from case_id::text then raise exception 'Authoritative case context missing'; end if;
 sid:=(issued->>'session_id')::uuid;
 reset role;
 select snapshot->(case_id::text||':0')->>'key' into key from app_private.verified_sessions where id=sid;
 set local role authenticated;
 replay:=public.finish_verified_session(sid,jsonb_build_object(case_id::text||':0',key));
 if (replay->>'score')::int<>1 then raise exception 'Case inner grading failed'; end if;
  blocked:=false;
  begin perform public.begin_verified_session(gen_random_uuid(),'case_study',array[case_id::text||':00']);
  exception when invalid_parameter_value then blocked:=true; end;
  if not blocked then raise exception 'Noncanonical case index accepted'; end if;
  -- Content mutation is in a nested rollback fixture; no bank edit persists.
  issued:=public.begin_verified_session(gen_random_uuid(),'mcq',array[qid::text]); sid:=(issued->>'session_id')::uuid;
  reset role;
  begin
    update public.questions_base set explanation=coalesce(explanation,'')||' [rolled-back security fixture]' where id=qid;
    set local role authenticated;
    blocked:=false;
    begin perform public.finish_verified_session(sid,answers);
    exception when invalid_parameter_value or insufficient_privilege then blocked:=true; end;
    reset role;
    if not blocked then raise exception 'Changed content rewarded'; end if;
    raise exception 'Rollback content fixture' using errcode='Z0001';
  exception when sqlstate 'Z0001' then null; end;
  set local role authenticated;
 -- Expired issuance cannot mint a reward.
 issued:=public.begin_verified_session(gen_random_uuid(),'mcq',array[qid::text]); sid:=(issued->>'session_id')::uuid;
 reset role;
 update app_private.verified_sessions set expires_at=clock_timestamp()-interval '1 second' where id=sid;
 set local role authenticated;
 blocked:=false;
 begin perform public.finish_verified_session(sid,answers);
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Expired session accepted'; end if;
 -- A newly quarantined item blocks both a fresh start and unfinished completion.
 issued:=public.begin_verified_session(gen_random_uuid(),'mcq',array[qid::text]); sid:=(issued->>'session_id')::uuid;
 reset role;
 insert into public.content_quarantine(content_type,content_id,reason) values('question',qid,'rolled_back_verified_session_test');
 set local role authenticated;
 blocked:=false;
 begin perform public.finish_verified_session(sid,answers);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Quarantined completion accepted'; end if;
 blocked:=false;
 begin perform public.begin_verified_session(gen_random_uuid(),'mcq',array[qid::text]);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Quarantined issuance accepted'; end if;
 reset role;
end $test$;
select 'PASS: positive grading, wrong answers, flashcards, cases, retries, unique reward, owner isolation, private state, expiry and quarantine; ALL rolled back' result;
do $extra$
declare uid uuid; qid uuid; rid uuid; blocked boolean;
begin
 select p.id into uid from public.user_profiles p limit 1;
 select id into qid from public.questions limit 1;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 set local role authenticated;
 blocked:=false;
 begin perform public.credit_xp('mcq',1,1,false,0,0); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Direct XP call allowed'; end if;
 blocked:=false;
 begin perform public.record_answer(qid,'mcq','test','test','test','easy',true,'A'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Direct history RPC allowed'; end if;
 blocked:=false;
 begin insert into public.quiz_sessions(user_id,question_ids,answers,score,xp_earned)values(uid,array[qid],'{}',999,999); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Forged result insert allowed'; end if;
 blocked:=false;
 begin insert into public.user_question_history(user_id,question_id)values(uid,qid); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Forged history insert allowed'; end if;
 reset role;
 -- Remove a possible existing open report only inside this rolled-back fixture.
 delete from public.question_reports where user_id=uid and question_id=qid and status='open';
 set local role authenticated;
 insert into public.question_reports(user_id,question_id,question_type,reason,platform,app_version,app_build,os_version,app_screen)
 values(uid,qid,'mcq','other','ios','1.0.0','18','26.3.1','mcq') returning id into rid;
 if not exists(select 1 from public.question_reports where id=rid and app_build='18' and platform='ios') then raise exception 'Report build not persisted'; end if;
 blocked:=false;
 begin insert into public.question_reports(user_id,question_id,question_type,reason,app_screen)
 values(uid,qid,'mcq','other','/route?secret=value'); exception when check_violation then blocked:=true; end;
 if not blocked then raise exception 'Raw route accepted as report screen'; end if;
 reset role;
end $extra$;
select 'PASS: direct reward/history/result writes denied; report metadata persists; screen allowlist enforced; ALL rolled back' result;

rollback;

