-- Read-only admin roster: registration exists independently of onboarding.
-- Never create placeholder profiles or change Auth triggers to populate this UI.
create or replace function public.admin_registered_users() returns jsonb
language plpgsql stable security definer set search_path='' set statement_timeout='3s'
as $fn$
begin
 if auth.uid() is null or public.is_admin() is distinct from true then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 return (select coalesce(jsonb_agg(r order by r.created_at desc,r.id),'[]'::jsonb) from (
  select u.id,u.email,u.created_at,u.last_sign_in_at,
   u.email_confirmed_at is not null as email_confirmed,
   p.id is not null as has_profile,
   p.full_name,p.profession,p.study_year,p.level,p.xp,p.current_streak,p.longest_streak,
   p.last_active_date,p.frozen_dates,p.access_key,
   greatest(p.last_seen_at,(select max(a.last_seen_at) from public.app_presence a where a.user_id=u.id)) as last_seen_at
  from auth.users u left join public.user_profiles p on p.id=u.id
  where u.deleted_at is null
 ) r);
end $fn$;
revoke all on function public.admin_registered_users() from public,anon,authenticated;
grant execute on function public.admin_registered_users() to authenticated;
