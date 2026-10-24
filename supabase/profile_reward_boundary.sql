-- Keep existing onboarding/profile/streak clients working while protecting
-- fields that are exclusively server/admin-owned. No auth.users trigger,
-- serving-view changes, bank scans, or client-controlled bypass flags.
set lock_timeout = '2s';
set statement_timeout = '10s';

create or replace function public.guard_profile_server_fields()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  -- SECURITY DEFINER reward RPCs run as their owner. Direct REST writes run
  -- as anon/authenticated. Never trust an editable JWT user_metadata flag.
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if public.is_admin() then return new; end if;
  if auth.uid() is null or new.id is distinct from auth.uid() then
    raise exception 'Profile ownership required' using errcode='42501';
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.xp,0) <> 0 or coalesce(new.level,1) <> 1
       or new.access_key is not null or new.xp_boost_until is not null
       or coalesce(new.current_streak,0) <> 0 or coalesce(new.longest_streak,0) <> 0
       or new.last_active_date is not null or coalesce(new.streak_freezes,0) <> 0
       or coalesce(cardinality(new.frozen_dates),0) <> 0
       or coalesce(new.tier,0) <> 0 or coalesce(new.tier_score,0) <> 0 then
      raise exception 'Initial rewards must use server defaults' using errcode='42501';
    end if;
    -- A supplied signup timestamp is not an authority source.
    new.created_at := now();
  elsif new.id is distinct from old.id or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at
     or new.xp is distinct from old.xp or new.level is distinct from old.level
     or new.access_key is distinct from old.access_key
     or new.xp_boost_until is distinct from old.xp_boost_until then
    raise exception 'Server-owned profile fields cannot be changed directly' using errcode='42501';
  end if;
  return new;
end $fn$;
revoke all on function public.guard_profile_server_fields() from public,anon,authenticated;
create trigger guard_profile_server_fields before insert or update on public.user_profiles
for each row execute function public.guard_profile_server_fields();

-- These seven private operational tables had no app-role grants already.
-- Preserve that restriction and add deny-by-default RLS for defense in depth.
alter table question_audit.openai_snapshot enable row level security;
alter table question_audit.openai_snapshot2 enable row level security;
alter table question_audit.release_candidates enable row level security;
alter table question_audit.cowork_benchmark_runs enable row level security;
alter table question_audit.cowork_benchmark_results enable row level security;
alter table question_audit.cowork_benchmark_manifest enable row level security;
alter table question_audit.cloud_pilot_manifest enable row level security;

-- Ordinary UPDATE must not be able to move a row to another identity.
alter policy "Users can update own profile" on public.user_profiles
to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "Users can insert own profile" on public.user_profiles
to authenticated with check ((select auth.uid()) = id);
revoke truncate,references,trigger on public.user_profiles from anon,authenticated;
