-- Projection-only change: never updates profiles, ranking, rewards, Auth or content.
begin;
set local lock_timeout='2s';
set local statement_timeout='15s';
create or replace function app_private.curated_avatar(p_avatar text, p_id uuid)
returns text language sql immutable set search_path='' as $$
 select case when p_avatar ~ '^preset:([1-9]|[12][0-9]|30)$' then p_avatar
 else 'preset:' || (1 + (('x'||left(md5(p_id::text),7))::bit(28)::int % 30))::text end;
$$;
revoke all on function app_private.curated_avatar(text,uuid) from public,anon,authenticated;

do $$
declare body text;
begin
 body:=pg_get_functiondef('public.get_public_profile(uuid)'::regprocedure);
 if strpos(body,'as current_streak, avatar_url, tier, false as is_bot')=0
 or strpos(body,'b.streak_days, b.avatar, b.tier, true')=0 then raise exception 'Unexpected public profile projection'; end if;
 body:=replace(body,'as current_streak, avatar_url, tier, false as is_bot',
   'as current_streak, app_private.curated_avatar(avatar_url,id) as avatar_url, tier, false as is_bot');
 body:=replace(body,'b.streak_days, b.avatar, b.tier, true',
   'b.streak_days, app_private.curated_avatar(b.avatar,b.id), b.tier, true');
 execute body;

 body:=pg_get_functiondef('public.get_weekly_league()'::regprocedure);
 if strpos(body,'select id, full_name, avatar_url, profession, tier, level, current_streak,')=0 then raise exception 'Unexpected weekly projection'; end if;
 execute replace(body,'select id, full_name, avatar_url, profession, tier, level, current_streak,',
   'select id, full_name, app_private.curated_avatar(avatar_url,id) as avatar_url, profession, tier, level, current_streak,');

 body:=pg_get_functiondef('public.get_leaderboard(integer)'::regprocedure);
 if strpos(body,'h.current_streak, h.last_active_date, h.avatar_url, h.profession')=0 then raise exception 'Unexpected leaderboard projection'; end if;
 execute replace(body,'h.current_streak, h.last_active_date, h.avatar_url, h.profession',
   'h.current_streak, h.last_active_date, app_private.curated_avatar(h.avatar_url,h.id) as avatar_url, h.profession');

 body:=pg_get_functiondef('public.get_tournament()'::regprocedure);
 if strpos(body,'''avatar_url'', p.avatar_url')=0 then raise exception 'Unexpected tournament projection'; end if;
 execute replace(body,'''avatar_url'', p.avatar_url',
   '''avatar_url'', app_private.curated_avatar(p.avatar_url,p.id)');
end $$;
commit;
