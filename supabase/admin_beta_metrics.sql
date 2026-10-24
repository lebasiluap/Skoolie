-- Read-only admin metrics. Existing app/audit/Auth tables and serving gates are unchanged.
create or replace function public.admin_beta_metrics(p_days integer default 30)
returns jsonb language plpgsql security definer
set search_path = '' set timezone = 'UTC' set statement_timeout = '8s'
as $fn$
declare v_start timestamptz; v_prev timestamptz; v_result jsonb;
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_days is null or p_days not in (7,30,90) then raise exception 'Choose 7, 30 or 90 days' using errcode='22023'; end if;
 v_start := date_trunc('day',now())-(p_days-1)*interval '1 day';
 v_prev := v_start-p_days*interval '1 day';
 with sessions as materialized (
  select s.*,coalesce(cardinality(s.question_ids),0) as n,
   (s.score is not null and s.score>=0 and s.score<=coalesce(cardinality(s.question_ids),0) and coalesce(cardinality(s.question_ids),0)>0) as valid_score
  from public.quiz_sessions s where s.started_at>=v_prev and s.started_at<=now()
 ), cur as materialized (select * from sessions where started_at>=v_start),
 people as materialized (
  select p.id,p.full_name,p.profession,p.country,p.study_year,p.created_at,p.current_streak,p.longest_streak,p.xp,p.last_seen_at,
   exists(select 1 from public.quiz_sessions s where s.user_id=p.id and s.started_at>=p.created_at and s.started_at<=now()) as activated
  from public.user_profiles p
 ), daily as (
  select d::date as day,
   (select count(*) from people p where p.created_at>=d and p.created_at<d+interval '1 day') as signups,
   (select count(*) from cur s where s.started_at>=d and s.started_at<d+interval '1 day') as sessions,
   (select count(distinct s.user_id) from cur s where s.started_at>=d and s.started_at<d+interval '1 day') as learners,
   (select coalesce(sum(s.n),0) from cur s where s.started_at>=d and s.started_at<d+interval '1 day') as responses
  from generate_series(v_start,date_trunc('day',now()),interval '1 day') d
 ), cohort as materialized (
  select p.*,
   exists(select 1 from public.quiz_sessions s where s.user_id=p.id and s.started_at>=date_trunc('day',p.created_at)+interval '7 days' and s.started_at<date_trunc('day',p.created_at)+interval '8 days') as day7_return
  from people p where p.created_at>=v_start and p.created_at<date_trunc('day',now())-interval '7 days'
 )
 select jsonb_build_object(
  'schema_version',1,'measured_at',now(),'window_start',v_start,'days',p_days,
  'summary',jsonb_build_object(
    'users',(select count(*) from people),'new_users',(select count(*) from people where created_at>=v_start and created_at<=now()),
    'previous_new_users',(select count(*) from people where created_at>=v_prev and created_at<v_start),
    'learners',(select count(distinct user_id) from cur),
    'dau',(select count(distinct user_id) from sessions where started_at>=date_trunc('day',now())),
    'wau',(select count(distinct user_id) from sessions where started_at>=now()-interval '7 days'),
    'mau',(select count(distinct user_id) from public.quiz_sessions where started_at>=now()-interval '30 days' and started_at<=now()),
    'recently_seen',(select count(*) from people where last_seen_at>=now()-interval '5 minutes' and last_seen_at<=now()),
    'sessions',(select count(*) from cur),'previous_sessions',(select count(*) from sessions where started_at<v_start),
    'responses',(select coalesce(sum(n),0) from cur),'objective_correct',(select coalesce(sum(score),0) from cur where valid_score and mode is distinct from 'flashcard'),
    'objective_responses',(select coalesce(sum(n),0) from cur where valid_score and mode is distinct from 'flashcard'),
    'flashcard_recalled',(select coalesce(sum(score),0) from cur where valid_score and mode='flashcard'),
    'flashcard_responses',(select coalesce(sum(n),0) from cur where valid_score and mode='flashcard'),
    'invalid_score_sessions',(select count(*) from cur where not valid_score),
    'activated_new',(select count(*) from people where created_at>=v_start and created_at<=now() and activated),
    'day7_eligible',(select count(*) from cohort),'day7_returned',(select count(*) from cohort where day7_return),
    'streak_users',(select count(*) from people where current_streak>0),'max_streak',(select coalesce(max(longest_streak),0) from people),
    'xp_recorded',(select coalesce(sum(xp_earned),0) from cur)),
  'daily',(select coalesce(jsonb_agg(daily order by day),'[]'::jsonb) from daily),
  'modes',(select coalesce(jsonb_agg(x order by sessions desc),'[]'::jsonb) from
    (select coalesce(mode,'unknown') as mode,count(*) as sessions,sum(n) as responses,
     coalesce(sum(score) filter(where valid_score),0) as correct,coalesce(sum(n) filter(where valid_score),0) as scored_responses from cur group by mode)x),
  'topics',(select coalesce(jsonb_agg(x order by responses desc),'[]'::jsonb) from
    (select coalesce(topic,'Mixed / unspecified') as topic,count(*) as sessions,sum(n) as responses,
     coalesce(sum(score) filter(where valid_score and mode is distinct from 'flashcard'),0) as correct,
     coalesce(sum(n) filter(where valid_score and mode is distinct from 'flashcard'),0) as scored_responses
     from cur group by topic order by sum(n) desc limit 30)x),
  'professions',(select coalesce(jsonb_agg(x order by users desc),'[]'::jsonb) from
    (select coalesce(p.profession,'Not set') as profession,count(*) as users,count(*) filter(where p.activated) as activated,
     count(*) filter(where exists(select 1 from cur s where s.user_id=p.id)) as learners from people p group by p.profession)x),
  'countries',(select coalesce(jsonb_agg(x order by users desc),'[]'::jsonb) from
    (select coalesce(country,'Not set') as country,count(*) as users from people group by country order by count(*) desc limit 15)x),
  'people',(select coalesce(jsonb_agg(x order by created_at desc),'[]'::jsonb) from
    (select full_name,profession,country,created_at,activated,current_streak from people order by created_at desc limit 25)x),
  'traffic',jsonb_build_object('views',(select count(*) from public.page_views where created_at>=v_start and created_at<=now()),
    'paths',(select coalesce(jsonb_agg(x order by views desc),'[]'::jsonb) from
     (select path,count(*) as views from public.page_views where created_at>=v_start and created_at<=now() group by path order by count(*) desc limit 10)x)),
  'reports',jsonb_build_object(
    'open',(select count(*) from public.question_reports where status='open'),
    'oldest_open_at',(select min(created_at) from public.question_reports where status='open'),
    'new',(select count(*) from public.question_reports where created_at>=v_start and created_at<=now()),
    'resolved',(select count(*) from public.question_reports where resolved_at>=v_start and resolved_at<=now()),
    'mean_resolution_hours',(select round(avg(extract(epoch from resolved_at-created_at)/3600)::numeric,1) from public.question_reports where resolved_at>=v_start and resolved_at<=now() and resolved_at>=created_at),
    'reasons',(select coalesce(jsonb_agg(x order by reports desc),'[]'::jsonb) from
     (select reason,count(*) as reports from public.question_reports where status='open' group by reason)x))
 ) into v_result;
 return v_result;
end;
$fn$;
revoke all on function public.admin_beta_metrics(integer) from public,anon,authenticated;
grant execute on function public.admin_beta_metrics(integer) to authenticated;

create or replace function public.admin_content_metrics()
returns jsonb language plpgsql security definer
set search_path = '' set timezone='UTC' set statement_timeout='8s'
as $fn$
declare v_result jsonb;
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 with findings as materialized (
 select i.audit_item_id,i.issue_code from question_audit.phase_a_issues i
 join question_audit.audit_items a on a.id=i.audit_item_id and a.current_hash=i.reviewed_content_hash
 where i.resolution_status='open' and a.phase_a_status not in ('orphaned','superseded')
 ), q as materialized(select question_type,topic,difficulty from question_audit.serving_questions_catalog),
 a as materialized(select content_type,phase_a_status from question_audit.audit_items where phase_a_status not in ('orphaned','superseded'))
 select jsonb_build_object(
  'measured_at',now(),'serving_mode',(select mode from question_audit.serving_policy limit 1),
  'total_questions',(select count(*) from public.questions_base),'released_questions',(select count(*) from public.questions),'catalog_questions',(select count(*) from q),
  'total_cases',(select count(*) from public.case_studies_base),'released_cases',(select count(*) from public.case_studies),
  'flagged_units',(select count(distinct audit_item_id) from findings),'issue_tags',(select count(*) from findings),
  'pending_status',(select count(*) from a where phase_a_status='pending'),
  'running',(select count(*) from a where phase_a_status='running'),
  'unclosed_batches',(select count(*) from question_audit.phase_a_batches b where finished_at is null and not exists(select 1 from question_audit.phase_a_voided_runs v where v.task_run_id=b.run_id)),
  'types',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select question_type,count(*) as available from q group by question_type)x),
  'difficulty',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select coalesce(difficulty,'Not set') as difficulty,count(*) as available from q group by difficulty)x),
  'topics',(select coalesce(jsonb_agg(x order by available desc),'[]'::jsonb) from (select coalesce(topic,'Not set') as topic,count(*) as available from q group by topic order by count(*) desc limit 50)x),
  'findings',(select coalesce(jsonb_agg(x order by units desc),'[]'::jsonb) from (select issue_code,count(*) as tags,count(distinct audit_item_id) as units from findings group by issue_code)x),
  'statuses',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select content_type,phase_a_status,count(*) as units from a group by content_type,phase_a_status)x)
 ) into v_result;
 return v_result;
end;
$fn$;
revoke all on function public.admin_content_metrics() from public,anon,authenticated;
grant execute on function public.admin_content_metrics() to authenticated;

