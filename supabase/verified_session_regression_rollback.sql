-- Known-outcome integration tests on released bank items. No medical review.
-- Every result, reward, quarantine fixture and content mutation is ROLLED BACK.
begin;
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
rollback;
