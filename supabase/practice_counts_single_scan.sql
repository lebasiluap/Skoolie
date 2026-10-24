-- Same strict serving views and filter semantics; resolve country once and
-- aggregate both question types in one scan instead of separate subqueries.
create or replace function public.get_practice_counts(p_profession text,p_region text default null,p_access_key text default null)
returns table(mcq bigint,flashcard bigint,case_study bigint)
language plpgsql stable security definer set search_path='' as $fn$
declare country text;
begin
 select coalesce(up.country,'Ghana') into country from public.user_profiles up where up.id=auth.uid();
 country:=coalesce(country,'Ghana');
 return query
 select count(*) filter(where q.question_type='mcq'),count(*) filter(where q.question_type='flashcard'),
 (select count(*) from public.case_studies c where c.professions @> array[p_profession]
  and (c.region is null or c.region='universal' or lower(c.region)=lower(country))
  and (p_region is null or c.region=p_region))
 from question_audit.serving_questions_catalog q
 where q.professions @> array[p_profession] and q.question_type in ('mcq','flashcard')
 and (q.region is null or q.region='universal' or lower(q.region)=lower(country))
 and (p_region is null or q.region=p_region) and (q.access_key is null or q.access_key=p_access_key);
end $fn$;
-- CREATE OR REPLACE retains the existing, intentionally app-callable ACL.
