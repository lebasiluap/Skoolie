-- Run after admin_content_tools.sql inside the SAME rollback-only transaction.
-- This transaction exercises dozens of trigger-bearing edits; individual app
-- requests still use their normal short timeout. No full-bank refresh runs.
set local statement_timeout='40s';
do $test$
declare admin_id uuid; normal_id uuid; qid uuid; report_id uuid:=gen_random_uuid(); old_text text; out_json jsonb; blocked boolean; count_before bigint; tstamp timestamptz;
 prof text; mode_name text; issued jsonb; v_session_id uuid;
 field_name text; previous_value text; next_value text; audit_before bigint; fc_id uuid; fc_old text;
begin
 select id into admin_id from auth.users where email='lebasiluap@gmail.com';
 select id,profession into normal_id,prof from public.user_profiles where id<>admin_id and profession is not null limit 1;
 perform set_config('request.jwt.claim.sub',normal_id::text,true);
 select q.id,q.question_text,case when q.question_type='flashcard' then 'flashcard' else 'mcq' end into qid,old_text,mode_name from public.questions q
 where q.professions @> array[prof] and public.region_visible(q.region) and q.access_key is null
 and q.question_type in ('mcq','flashcard') and (q.question_type='flashcard' or q.correct_answer ~ '^[A-D]$')
 and not exists(select 1 from public.question_reports r where r.question_id=q.id and r.user_id=admin_id and r.status='open') limit 1;
 if admin_id is null or normal_id is null or qid is null then raise exception 'Missing fixtures'; end if;
 select count(*) into count_before from public.audit_serving_clearance;
 perform set_config('request.jwt.claim.sub',normal_id::text,true);
 set local role authenticated;
 issued:=public.begin_verified_session(gen_random_uuid(),mode_name,array[qid::text]);
 v_session_id:=(issued->>'session_id')::uuid;
 blocked:=false; begin perform public.admin_question_catalog(); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Non-admin read allowed'; end if;
 blocked:=false; begin perform public.admin_report_queue(); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Non-admin report queue allowed'; end if;
 blocked:=false; begin perform public.admin_edit_question(qid,'question_text','bad',old_text); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Non-admin edit allowed'; end if;
 blocked:=false; begin perform public.admin_set_report_status('resolved',report_id); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Non-admin resolution allowed'; end if;
 blocked:=false;
 begin insert into public.question_reports(user_id,question_id,question_type,reason,status) values(normal_id,qid,'mcq','other','resolved');
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Reporter forged a resolved report'; end if;
 reset role;
 perform set_config('request.jwt.claim.sub','',true);
 set local role anon;
 blocked:=false; begin perform public.admin_question_catalog(); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Anonymous access allowed'; end if;
 reset role;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 insert into public.question_reports(id,user_id,question_id,question_type,reason,note)
 select report_id,admin_id,id,case when question_type='flashcard' then 'flashcard' else 'mcq' end,'other','Rollback-only admin regression' from public.questions_base where id=qid;
 set local role authenticated;
 if public.admin_set_report_status('resolved',report_id)<>1 then raise exception 'Resolve failed'; end if;
 select resolved_at into tstamp from public.question_reports where id=report_id;
 if public.admin_set_report_status('resolved',report_id)<>1 or (select resolved_at from public.question_reports where id=report_id) is distinct from tstamp then raise exception 'Resolve retry changed timestamp'; end if;
 if public.admin_set_report_status('open',report_id)<>1 then raise exception 'Reopen failed'; end if;
 if public.admin_set_report_status('dismissed',report_id)<>1 then raise exception 'Dismiss failed'; end if;
 blocked:=false; begin perform public.admin_set_report_status('bad',report_id); exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Invalid status allowed'; end if;
 blocked:=false; begin perform public.admin_set_report_status('resolved',gen_random_uuid()); exception when no_data_found then blocked:=true; end;
 if not blocked then raise exception 'Missing report reported success'; end if;
 blocked:=false; begin perform public.admin_set_report_status('resolved',report_id,qid); exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Ambiguous target allowed'; end if;
 reset role;
 if (select count(*) from public.audit_serving_clearance)<>count_before then raise exception 'Report resolution changed clearance'; end if;
 set local role authenticated;
 out_json:=public.admin_edit_question(qid,'question_text',old_text,old_text);
 if (out_json->>'changed')::boolean then raise exception 'No-op marked changed'; end if;
 blocked:=false; begin perform public.admin_edit_question(qid,'question_text','new text','stale value'); exception when serialization_failure then blocked:=true; end;
 if not blocked then raise exception 'Stale draft overwrote content'; end if;
 blocked:=false; begin perform public.admin_edit_question(qid,'id','bad',null); exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Unsafe field allowed'; end if;
 out_json:=public.admin_edit_question(qid,'question_text',old_text||' [rollback test]',old_text);
 if not (out_json->>'changed')::boolean then raise exception 'Positive edit failed'; end if;
 if exists(select 1 from public.questions where id=qid) then raise exception 'Changed item leaked through serving view'; end if;
 if exists(select 1 from public.questions_base where id=qid) then raise exception 'Changed item leaked through base RLS'; end if;
 out_json:=public.admin_question_catalog(jsonb_build_object('id',qid));
 if jsonb_array_length(out_json->'questions')<>1 or (out_json->'questions'->0->>'released')::boolean then raise exception 'Admin cannot manage edited quarantined item'; end if;
 out_json:=public.admin_report_queue();
 if not exists(select 1 from jsonb_array_elements(out_json) r where r->>'id'=report_id::text and r->'questions'->>'id'=qid::text) then raise exception 'Report lost quarantined item context'; end if;
 perform public.admin_set_report_status('open',report_id);
 if public.admin_set_report_status('resolved',null,qid) < 1 then raise exception 'Bulk resolution failed'; end if;
 if exists(select 1 from public.questions where id=qid) then raise exception 'Resolve released edited content'; end if;
 reset role;
 if not exists(select 1 from app_private.admin_content_edits where question_id=qid and actor_id=admin_id and field='question_text' and old_value=old_text and new_value=old_text||' [rollback test]') then raise exception 'Edit audit trail missing'; end if;
 perform set_config('request.jwt.claim.sub',normal_id::text,true);
 set local role authenticated;
 blocked:=false;
 begin perform public.finish_verified_session(v_session_id,jsonb_build_object(qid::text,case when mode_name='flashcard' then 'true'::jsonb else '"A"'::jsonb end));
 exception when insufficient_privilege or invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Changed content graded against new answer'; end if;
 reset role;
 if exists(select 1 from app_private.reward_receipts r where r.session_id=v_session_id) then raise exception 'Changed content earned a reward'; end if;
 if exists(select 1 from public.audit_serving_clearance where content_type='question' and content_id=qid) then raise exception 'Clearance restored'; end if;
 -- Each allowlisted field executes its real database branch (all changes roll back).
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 update public.questions_base set access_key='rollback-admin-key' where id=qid;
 foreach field_name in array array['topic','category','subtopic','difficulty','question_text','correct_answer','explanation','region','access_key','high_yield'] loop
   select to_jsonb(q)->>field_name into previous_value from public.questions_base q where id=qid;
   next_value:=case field_name
     when 'difficulty' then case when previous_value='easy' then 'medium' else 'easy' end
     when 'region' then case when previous_value='ghana' then 'universal' else 'ghana' end
     when 'high_yield' then case when previous_value='true' then 'false' else 'true' end
     when 'access_key' then ''
     when 'correct_answer' then case when mode_name='mcq' then case when previous_value='A' then 'B' else 'A' end else coalesce(previous_value,'')||' rollback answer' end
     else coalesce(previous_value,'')||' rollback edit' end;
   select count(*) into audit_before from app_private.admin_content_edits where question_id=qid;
   set local role authenticated;
   out_json:=public.admin_edit_question(qid,field_name,next_value,previous_value);
   reset role;
   if not (out_json->>'changed')::boolean or (select count(*) from app_private.admin_content_edits where question_id=qid)<>audit_before+1 then raise exception 'Field branch/audit failed: %',field_name; end if;
 end loop;
 foreach field_name in array array['category','subtopic','explanation','access_key','region'] loop
   if exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions_base' and column_name=field_name and is_nullable='YES') then
     execute format('update public.questions_base set %I=null where id=$1',field_name) using qid;
     select count(*) into audit_before from app_private.admin_content_edits where question_id=qid;
     set local role authenticated;
     out_json:=public.admin_edit_question(qid,field_name,'',null);
     reset role;
     if (out_json->>'changed')::boolean or (select count(*) from app_private.admin_content_edits where question_id=qid)<>audit_before then raise exception 'NULL no-op failed: %',field_name; end if;
   end if;
 end loop;
 select id,correct_answer into fc_id,fc_old from public.questions_base where question_type='flashcard' limit 1;
 set local role authenticated;
 perform public.admin_edit_question(fc_id,'correct_answer','Rollback-only flashcard answer',fc_old);
 blocked:=false; begin perform public.admin_edit_question(qid,'access_key','never-known-regression-key',null); exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Unknown access key accepted'; end if;
 if public.admin_archive_question(qid)<>1 then raise exception 'Archive failed'; end if;
 reset role;
 if not exists(select 1 from public.questions_base where id=qid) or not exists(select 1 from public.question_reports where id=report_id) then raise exception 'Archive destroyed content/reports'; end if;
 set local role authenticated;
 if exists(select 1 from public.questions where id=qid) then raise exception 'Archive leaked into serving'; end if;
 reset role;
 raise notice 'PASS: admin positive CRUD paths, non-admin/anon denial, stale draft rejection, no-op, row counts, report statuses, serving/base quarantine and preserved report context';
end $test$;
rollback;
select 'PASS: all admin-content regression assertions completed and rolled back' as result;
