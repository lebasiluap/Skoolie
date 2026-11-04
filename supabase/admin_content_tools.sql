-- Admin-only maintenance lane. Never changes Auth, rewards, serving policies or
-- audit verdicts. Resolving a user report is NOT an audit-clearance operation.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';

create table if not exists app_private.admin_content_edits (
 id bigint generated always as identity primary key,
 actor_id uuid not null, question_id uuid not null, field text not null,
 old_value text, new_value text, created_at timestamptz not null default clock_timestamp()
);
alter table app_private.admin_content_edits enable row level security;
revoke all on app_private.admin_content_edits from public,anon,authenticated;
-- Reporters may create only a new open report; they cannot manufacture a
-- resolution by supplying status fields during INSERT.
alter policy "Users can insert own reports" on public.question_reports
 with check (auth.uid()=user_id and status='open' and resolved_at is null and resolution_note is null);

create or replace function public.admin_question_catalog(p_filters jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare result jsonb; page_num integer;
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then
   raise exception 'Admin access required' using errcode='42501'; end if;
 if p_filters is null or jsonb_typeof(p_filters)<>'object' then
   raise exception 'Invalid filters' using errcode='22023'; end if;
 page_num:=greatest(1,least(20000,coalesce((p_filters->>'page')::integer,1)));
 with matches as materialized (
   select q.id,q.topic,q.category,q.subtopic,q.question_type,q.difficulty,q.options,
     q.question_text,q.correct_answer,q.explanation,q.access_key,q.high_yield,q.region,
     exists(select 1 from public.audit_serving_clearance s where s.content_type='question' and s.content_id=q.id)
       and not exists(select 1 from public.content_quarantine c where c.content_type='question' and c.content_id=q.id) as released
   from public.questions_base q
   where (nullif(p_filters->>'id','') is null or q.id=(p_filters->>'id')::uuid)
    and (nullif(p_filters->>'topic','') is null or q.topic=p_filters->>'topic')
    and (nullif(p_filters->>'type','') is null or q.question_type=p_filters->>'type')
    and (nullif(p_filters->>'course','') is null or q.category=p_filters->>'course')
    and (nullif(p_filters->>'difficulty','') is null or q.difficulty=p_filters->>'difficulty')
    and (nullif(p_filters->>'subtopic','') is null or strpos(lower(q.subtopic),lower(p_filters->>'subtopic'))>0)
    and (nullif(p_filters->>'q','') is null or strpos(lower(q.question_text),lower(p_filters->>'q'))>0)
 ), page_rows as (select * from matches order by topic,subtopic,id limit 50 offset (page_num-1)*50)
 select jsonb_build_object('questions',coalesce((select jsonb_agg(to_jsonb(r) order by topic,subtopic,id) from page_rows r),'[]'),
   'total',(select count(*) from matches),
   'topics',(select coalesce(jsonb_agg(topic order by topic),'[]') from (select distinct topic from public.questions_base where topic is not null) t),
   'courses',(select coalesce(jsonb_agg(category order by category),'[]') from (select distinct category from public.questions_base where category is not null) c)) into result;
 return result;
end $$;

create or replace function public.admin_edit_question(p_id uuid,p_field text,p_value text,p_expected text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row_before public.questions_base; old_value text; affected integer; parsed text;
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then
   raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id is null or p_field is null or not p_field=any(array['topic','category','subtopic','difficulty','question_text','correct_answer','explanation','region','access_key','high_yield']) then
   raise exception 'Field not allowed' using errcode='22023'; end if;
 if p_value is not null and length(p_value)>20000 then raise exception 'Value too long' using errcode='22023'; end if;
 -- Same per-item lock as the serving invalidation/refresh lane, acquired first.
 perform pg_advisory_xact_lock(hashtextextended('audit-serving:question:'||p_id::text,0));
 select * into row_before from public.questions_base where id=p_id for update;
 if not found then raise exception 'Question not found' using errcode='P0002'; end if;
 old_value:=to_jsonb(row_before)->>p_field;
 if old_value is distinct from p_expected then raise exception 'Question changed. Reload before saving.' using errcode='40001'; end if;
 parsed:=p_value;
 if p_field in ('category','subtopic','explanation','access_key','region') and coalesce(btrim(parsed),'')='' then parsed:=null; end if;
 if p_field in ('topic','question_text','difficulty') and coalesce(btrim(parsed),'')='' then
   raise exception 'This field cannot be empty' using errcode='22023'; end if;
 if p_field='difficulty' and not parsed=any(array['easy','medium','hard']) then raise exception 'Invalid difficulty' using errcode='22023'; end if;
 if p_field='region' and parsed is not null and not parsed=any(array['universal','ghana']) then raise exception 'Invalid region' using errcode='22023'; end if;
 if p_field='access_key' and parsed is not null and not exists(select 1 from public.questions_base where access_key=parsed)
   and not exists(select 1 from public.user_profiles where access_key=parsed) then raise exception 'Unknown access key' using errcode='22023'; end if;
 if p_field='high_yield' and (parsed is null or parsed not in ('true','false')) then raise exception 'Invalid boolean' using errcode='22023'; end if;
 if old_value is not distinct from parsed then return jsonb_build_object('changed',false); end if;
 if p_field='correct_answer' then
   if coalesce(btrim(parsed),'')='' then raise exception 'Answer cannot be empty' using errcode='22023'; end if;
   if row_before.question_type='mcq' and coalesce((jsonb_typeof(row_before.options)<>'array'
     or jsonb_array_length(row_before.options) not between 2 and 6
     or parsed !~ '^[A-F]$' or ascii(parsed)-ascii('A')>=jsonb_array_length(row_before.options)),true) then
     raise exception 'Answer must be an existing option letter' using errcode='22023'; end if;
 end if;
 if p_field='high_yield' then
   update public.questions_base set high_yield=parsed::boolean where id=p_id;
 else
   execute format('update public.questions_base set %I=$1 where id=$2',p_field) using parsed,p_id;
 end if;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Save did not update exactly one question'; end if;
 -- All editable fields invalidate serving, including metadata not covered by
 -- the existing content trigger. Never insert clearance or remove quarantine.
 delete from public.audit_serving_clearance where content_type='question' and content_id=p_id;
 insert into app_private.admin_content_edits(actor_id,question_id,field,old_value,new_value)
 values(auth.uid(),p_id,p_field,old_value,parsed);
 return jsonb_build_object('changed',true,'requires_review',true);
end $$;

create or replace function public.admin_report_queue()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then raise exception 'Admin access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('questions',
   (select jsonb_build_object('id',q.id,'topic',q.topic,'subtopic',q.subtopic,'difficulty',q.difficulty,'question_type',q.question_type,'question_text',q.question_text,'options',q.options,'correct_answer',q.correct_answer,'explanation',q.explanation) from public.questions_base q where q.id=r.question_id),
   'case_studies',(select jsonb_build_object('id',c.id,'title',c.title,'topic',c.topic,'difficulty',c.difficulty,'clinical_vignette',c.clinical_vignette) from public.case_studies_base c where c.id=r.case_id)) order by r.created_at desc),'[]') into result
 from (select * from public.question_reports where status='open'
   union all (select * from public.question_reports where status<>'open' order by created_at desc,id limit 1000)) r;
 return result;
end $$;

create or replace function public.admin_set_report_status(p_status text,p_id uuid default null,p_question_id uuid default null,p_case_id uuid default null,p_note text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare affected integer; current_status text;
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_status is null or not p_status=any(array['open','resolved','dismissed'])
   or num_nonnulls(p_id,p_question_id,p_case_id)<>1 then raise exception 'Invalid status or report target' using errcode='22023'; end if;
 if p_note is not null and length(p_note)>500 then raise exception 'Note too long' using errcode='22023'; end if;
 if p_id is null and p_status<>'resolved' then raise exception 'Bulk operation only resolves open reports' using errcode='22023'; end if;
 if p_id is not null then
   select status into current_status from public.question_reports where id=p_id for update;
   if not found then raise exception 'No matching report. Reload and retry.' using errcode='P0002'; end if;
   -- A retry is acknowledged without changing the original resolution time.
   if current_status=p_status then return 1; end if;
 elsif (select count(*) from public.question_reports where status='open' and
   ((p_question_id is not null and question_id=p_question_id) or (p_case_id is not null and case_id=p_case_id)))>1000 then
   raise exception 'Too many reports; resolve a smaller set' using errcode='22023';
 end if;
 update public.question_reports set status=p_status,
   resolution_note=case when p_status='open' then null else nullif(btrim(p_note),'') end,
   resolved_at=case when p_status='open' then null else clock_timestamp() end
 where (p_id is not null and id=p_id)
    or (p_id is null and status='open' and ((p_question_id is not null and question_id=p_question_id) or (p_case_id is not null and case_id=p_case_id)));
 get diagnostics affected=row_count;
 if affected=0 then raise exception 'No matching report. Reload and retry.' using errcode='P0002'; end if;
 return affected;
exception when unique_violation then
 raise exception 'This user already has an open report on this item.' using errcode='23505';
end $$;

create or replace function public.admin_archive_question(p_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id is null then raise exception 'Question ID required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('audit-serving:question:'||p_id::text,0));
 perform 1 from public.questions_base where id=p_id for update;
 if not found then raise exception 'Question not found' using errcode='P0002'; end if;
 insert into public.content_quarantine(content_type,content_id,reason)
 values('question',p_id,'Admin archive: withheld from serving; content and history retained') on conflict do nothing;
 delete from public.audit_serving_clearance where content_type='question' and content_id=p_id;
 insert into app_private.admin_content_edits(actor_id,question_id,field,new_value) values(auth.uid(),p_id,'archive','quarantined');
 return 1;
end $$;

revoke all on function public.admin_question_catalog(jsonb),public.admin_edit_question(uuid,text,text,text),public.admin_report_queue(),public.admin_set_report_status(text,uuid,uuid,uuid,text),public.admin_archive_question(uuid) from public,anon;
grant execute on function public.admin_question_catalog(jsonb),public.admin_edit_question(uuid,text,text,text),public.admin_report_queue(),public.admin_set_report_status(text,uuid,uuid,uuid,text),public.admin_archive_question(uuid) to authenticated;
commit;
