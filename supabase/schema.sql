-- ─── Questions ────────────────────────────────────────────────────────────────

create table questions (
  id uuid primary key default gen_random_uuid(),
  professions text[] not null,                 -- ['pharmacy', 'medicine', 'nursing', 'general']
  course text not null,
  topic text not null,
  subtopic text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_type text not null check (question_type in ('mcq', 'flashcard', 'case_study')),
  question_text text not null,
  options jsonb not null,                       -- ["A. ...", "B. ...", "C. ...", "D. ..."]
  correct_answer text not null,                -- "A" | "B" | "C" | "D"
  explanation text not null,
  distractor_explanations jsonb default '{}',  -- {"A": "why A is wrong", ...}
  image_url text,
  region text not null check (region in ('ghana', 'universal')),
  source_reference text,
  date_reviewed date not null default current_date,
  high_yield boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for common filter patterns
create index on questions (difficulty);
create index on questions (question_type);
create index on questions (region);
create index on questions (high_yield);
create index on questions using gin (professions);   -- array containment queries

-- ─── User Profiles ─────────────────────────────────────────────────────────────

create table user_profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null,
  profession text not null check (profession in ('pharmacy', 'medicine', 'nursing', 'general')),
  country text not null default 'Ghana',
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- ─── Quiz Sessions ─────────────────────────────────────────────────────────────

create table quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles on delete cascade,
  question_ids uuid[] not null,
  answers jsonb not null default '{}',
  score integer not null default 0,
  xp_earned integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index on quiz_sessions (user_id);

-- ─── User Question Stats ───────────────────────────────────────────────────────

create table user_question_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles on delete cascade,
  question_id uuid not null references questions on delete cascade,
  times_seen integer not null default 0,
  times_correct integer not null default 0,
  last_seen_at timestamptz,
  unique (user_id, question_id)
);

create index on user_question_stats (user_id);

-- ─── Weekly Leagues ────────────────────────────────────────────────────────────

create table league_standings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles on delete cascade,
  league text not null check (league in ('bronze', 'silver', 'gold', 'diamond')),
  week_xp integer not null default 0,
  week_start date not null,
  rank integer,
  unique (user_id, week_start)
);

create index on league_standings (week_start, week_xp desc);

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table user_profiles enable row level security;
alter table quiz_sessions enable row level security;
alter table user_question_stats enable row level security;
alter table league_standings enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile" on user_profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on user_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on user_profiles for insert with check (auth.uid() = id);

-- Quiz sessions
create policy "Users can manage own sessions" on quiz_sessions for all using (auth.uid() = user_id);

-- Question stats
create policy "Users can manage own stats" on user_question_stats for all using (auth.uid() = user_id);

-- League standings — everyone can read, users update their own
create policy "Anyone can read league" on league_standings for select using (true);
create policy "Users can update own standing" on league_standings for all using (auth.uid() = user_id);

-- Questions are public (read-only via anon key)
alter table questions enable row level security;
create policy "Questions are public" on questions for select using (true);
