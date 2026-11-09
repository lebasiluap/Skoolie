-- Read-only checks under the ordinary user role; session-local settings rolled back.
begin;
set local statement_timeout='8s';
select set_config('request.jwt.claim.sub',id::text,true) from auth.users where email='testskoolie@gmail.com';
select set_config('skoolie.test_denied_question',q.id::text,true)
from public.questions_base q where not exists (
 select 1 from public.audit_serving_clearance c where c.content_type='question' and c.content_id=q.id
) limit 1;
select set_config('skoolie.test_denied_case',q.id::text,true)
from public.case_studies_base q where not exists (
 select 1 from public.audit_serving_clearance c where c.content_type='case_study' and c.content_id=q.id
) limit 1;
set local role authenticated;
do $$
declare uid uuid:=auth.uid(); qid uuid:=current_setting('skoolie.test_denied_question')::uuid;
 cid uuid:=current_setting('skoolie.test_denied_case')::uuid;
begin
 if uid is null or qid is null or cid is null then raise exception 'Missing guard fixture'; end if;
 if (select count(*) from public.user_profiles where id=uid)<>1 then raise exception 'Own profile access failed'; end if;
 if exists(select 1 from public.user_profiles where id<>uid) then raise exception 'Other private profiles exposed'; end if;
 if exists(select 1 from public.questions_base where id=qid)
 or exists(select 1 from public.questions where id=qid)
 or exists(select 1 from public.get_questions_by_ids(array[qid],1)) then raise exception 'Uncleared question leaked'; end if;
 if exists(select 1 from public.case_studies_base where id=cid)
 or exists(select 1 from public.case_studies where id=cid)
 or exists(select 1 from public.get_case_by_id(cid)) then raise exception 'Uncleared case leaked'; end if;
end $$;
rollback;
select 'PASS: own-profile access, private-profile isolation and uncleared question/case denial through base, view and ID RPC; no data changed' result;
