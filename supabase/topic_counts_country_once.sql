create or replace function public.get_question_counts(p_profession text,p_question_type text,p_access_key text default null,p_cognitive_type text default null,p_high_yield boolean default null,p_difficulty text default null)
returns table(topic text,category text,subtopic text,cnt bigint)
language plpgsql stable security definer set search_path='' as $fn$
declare country text;
begin
 select coalesce(up.country,'Ghana') into country from public.user_profiles up where up.id=auth.uid();
 country:=coalesce(country,'Ghana');
 return query select q.topic,q.category,q.subtopic,count(*)::bigint
 from question_audit.serving_questions_catalog q
 where q.professions @> array[p_profession] and q.question_type=p_question_type
 and (q.region is null or q.region='universal' or lower(q.region)=lower(country))
 and (q.access_key is null or (p_access_key is not null and q.access_key=p_access_key))
 and (p_cognitive_type is null or q.cognitive_type=p_cognitive_type)
 and (p_high_yield is null or (p_high_yield=true and q.high_yield=true))
 and (p_difficulty is null or q.difficulty=p_difficulty)
 group by q.topic,q.category,q.subtopic;
end $fn$;
