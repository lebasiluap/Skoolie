-- Two stored freezes maximum. A qualifying reward at capacity is consumed,
-- not banked as an IOU. Using one permits a NEW qualifying reward to refill it.
begin;
set local lock_timeout='2s';
set local statement_timeout='15s';

create table app_private.freeze_cap_adjustments (
 user_id uuid primary key references auth.users(id) on delete cascade,
 old_balance integer not null,
 removed integer not null,
 adjusted_at timestamptz not null default clock_timestamp()
);
alter table app_private.freeze_cap_adjustments enable row level security;
revoke all on app_private.freeze_cap_adjustments from public,anon,authenticated;

-- Lock each affected row before taking its snapshot; no concurrent award/use
-- can fall between the snapshot and trim. No study-day or streak edits.
with locked as materialized (
 select id,streak_freezes from public.user_profiles where streak_freezes>2 order by id for update
), saved as (
 insert into app_private.freeze_cap_adjustments(user_id,old_balance,removed)
 select id,streak_freezes,streak_freezes-2 from locked returning user_id
)
update public.user_profiles p set streak_freezes=2
from locked l join saved s on s.user_id=l.id where p.id=l.id;

create table app_private.freeze_cap_clamps (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 requested integer not null,
 applied integer not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table app_private.freeze_cap_clamps enable row level security;
revoke all on app_private.freeze_cap_clamps from public,anon,authenticated;

create function app_private.enforce_freeze_capacity() returns trigger
language plpgsql security invoker set search_path='' as $fn$
begin
 -- Existing ownership/server-field guards execute first (alphabetical order).
 -- This backstop must never turn a valid XP award into a failed transaction.
 if new.streak_freezes>2 then
  insert into app_private.freeze_cap_clamps(user_id,requested,applied) values(new.id,new.streak_freezes,2);
  new.streak_freezes:=2;
 end if;
 return new;
end $fn$;
revoke all on function app_private.enforce_freeze_capacity() from public,anon,authenticated;
create trigger zz_enforce_freeze_capacity before insert or update of streak_freezes on public.user_profiles
for each row execute function app_private.enforce_freeze_capacity();
alter table public.user_profiles add constraint streak_freezes_capacity check(streak_freezes between 0 and 2);

create function app_private.grant_streak_freezes(p_user uuid,p_amount integer) returns integer
language plpgsql security invoker set search_path='' as $fn$
declare before_balance integer; credited integer;
begin
 if p_amount is null or p_amount<0 then raise exception 'Invalid freeze grant' using errcode='22023';end if;
 select streak_freezes into before_balance from public.user_profiles where id=p_user for update;
 if not found then raise exception 'Profile not found';end if;
 credited:=least(p_amount,2-before_balance);
 if credited>0 then
  update public.user_profiles set streak_freezes=streak_freezes+credited where id=p_user;
 end if;
 return credited;
end $fn$;
revoke all on function app_private.grant_streak_freezes(uuid,integer) from public,anon,authenticated;

-- Exact guarded transformations of authoritative reward functions. Existing
-- source claim/receipt idempotency and XP logic are deliberately preserved.
do $patch$
declare body text; old text; replacement text;
begin
 body:=pg_get_functiondef('public.credit_xp(text,integer,integer,boolean,integer,integer)'::regprocedure);
 old:='update user_profiles set streak_freezes = streak_freezes + 1 where id = v_uid;';
 if strpos(body,old)=0 then raise exception 'Unexpected barrage grant contract';end if;
 execute replace(body,old,'perform app_private.grant_streak_freezes(v_uid,1);');

 body:=pg_get_functiondef('public.get_week_result()'::regprocedure);
 old:='update user_profiles set streak_freezes = streak_freezes + v_freezes where id = v_uid;';
 if strpos(body,old)=0 then raise exception 'Unexpected podium grant contract';end if;
 body:=replace(body,old,'v_freezes := app_private.grant_streak_freezes(v_uid,v_freezes); update public.week_rewards set freezes=v_freezes where user_id=v_uid and week_start=v_prev;');
 execute body;

 body:=pg_get_functiondef('public.check_trophies()'::regprocedure);
 old:='select * into p from user_profiles where id = v_uid;';
 if strpos(body,old)=0 then raise exception 'Unexpected trophy profile contract';end if;
 body:=replace(body,old,'select * into p from user_profiles where id = v_uid for update;');
 old:='streak_freezes = streak_freezes + v_freezes';
 if strpos(body,old)=0 then raise exception 'Unexpected trophy balance contract';end if;
 body:=replace(body,old,'streak_freezes = streak_freezes');
 old:='  return v_new;';
 replacement:=$text$
  v_freezes := app_private.grant_streak_freezes(v_uid,v_freezes);
  -- Allocate actual credited slots in stable trophy order. Old clients use
  -- reward_freezes, so retain that field but never return the nominal overflow.
  select coalesce(jsonb_agg(jsonb_set(e,'{reward_freezes}',to_jsonb(
   least(coalesce((e->>'reward_freezes')::integer,0),greatest(0,v_freezes-prior))::integer)) order by ord),'[]'::jsonb)
  into v_new from (
   select e,ord,coalesce(sum(coalesce((e->>'reward_freezes')::integer,0)) over(order by ord rows between unbounded preceding and 1 preceding),0)::integer as prior
   from jsonb_array_elements(v_new) with ordinality as items(e,ord)
  ) allocated;
  return v_new;
$text$;
 if strpos(body,old)=0 then raise exception 'Unexpected trophy result contract';end if;
 execute replace(body,old,replacement);

 body:=pg_get_functiondef('public.get_study_streak()'::regprocedure);
 old:='''current_streak'',current_streak';
 if strpos(body,old)=0 then raise exception 'Unexpected streak response contract';end if;
 execute replace(body,old,'''freeze_capacity'',2,''freeze_cap_adjusted'',exists(select 1 from app_private.freeze_cap_adjustments a where a.user_id=uid and a.adjusted_at>clock_timestamp()-interval ''30 days''),''current_streak'',current_streak');
end $patch$;
commit;
