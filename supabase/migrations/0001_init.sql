-- Liftbook schema (Phase 2 wires the app to it). Every user-owned table has
-- row-level security so a signed-in user can only read and write their own rows.

create extension if not exists "pgcrypto";

-- ---------- profile & preferences ----------
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  age int check (age between 13 and 100),
  height_cm numeric(5,1),
  sex text check (sex in ('male','female')),
  units text not null default 'metric' check (units in ('metric','imperial')),
  steps_band text not null default 'mid' check (steps_band in ('low','mid','high')),
  climate text not null default 'temperate',
  training_days_per_week int not null default 4,
  experience text check (experience in ('beginner','intermediate','advanced')),
  training_location text check (training_location in ('gym','home','both')),
  equipment text[] not null default '{}',
  avoid_exercises text[] not null default '{}',
  limitations text,
  dietary_preference text,
  meals_per_day int,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal text not null check (goal in ('bulk','lean_bulk','cut','recomp','maintain','general','strength','muscle')),
  target_weight_kg numeric(5,1),
  started_on date not null default current_date,
  ended_on date
);

-- Null means "use the calculated value".
create table public.macro_targets (
  user_id uuid primary key references auth.users on delete cascade,
  kcal int, protein_g int, carbs_g int, fat_g int, water_base_ml int,
  updated_at timestamptz not null default now()
);

create table public.dashboard_configs (
  user_id uuid primary key references auth.users on delete cascade,
  widget_order text[] not null,
  hidden text[] not null default '{}',
  water_quick int[] not null default '{150,250,500}',
  updated_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, unit text not null default 'reps', target int not null, increments int[] not null,
  sort int not null default 0, archived boolean not null default false
);

-- ---------- exercises & training ----------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,     -- null = global library row
  name text not null,
  primary_muscles text[] not null,
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  level text not null default 'beginner',
  is_compound boolean not null default false,
  instructions text, form_cues text[], common_mistakes text[],
  media_url text, media_license text,
  unique (user_id, name)
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, focus text, locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates on delete cascade,
  exercise_id uuid not null references public.exercises,
  position int not null, sets int not null, rep_low int not null, rep_high int not null,
  weight_step_kg numeric(4,2) not null default 2.5, rest_sec int not null default 90,
  superset_group int, locked boolean not null default false
);

create table public.workout_schedule (
  user_id uuid not null references auth.users on delete cascade,
  dow int not null check (dow between 0 and 6),
  template_id uuid references public.workout_templates on delete set null,
  locked boolean not null default false,
  primary key (user_id, dow)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid references public.workout_templates on delete set null,
  day date not null, started_at timestamptz, finished_at timestamptz, notes text
);

create table public.completed_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid references public.workout_sessions on delete cascade,
  day date not null, exercise_name text not null, exercise_id uuid references public.exercises,
  kg numeric(6,2) not null default 0, reps int not null, logged_at timestamptz not null default now()
);
create index on public.completed_sets (user_id, exercise_name, day);

create table public.sport_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null, sport text not null, minutes int not null check (minutes > 0)
);

-- ---------- nutrition ----------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,     -- null = shared database row
  name text not null, serving text not null, kcal numeric not null,
  protein_g numeric not null, carbs_g numeric not null, fat_g numeric not null,
  fiber_g numeric, sugar_g numeric, sodium_mg numeric,
  barcode text, source text not null default 'custom'       -- 'usda' | 'off' | 'custom' | ...
);
create index on public.foods (barcode);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, is_saved boolean not null default false
);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null, meal_id uuid references public.meals on delete set null,
  food_id uuid references public.foods on delete set null,
  name text not null, qty numeric not null default 1,
  kcal numeric not null, protein_g numeric not null, carbs_g numeric not null, fat_g numeric not null,
  source text not null default 'manual' check (source in ('manual','library','ai','barcode','import')),
  logged_at timestamptz not null default now()
);
create index on public.food_entries (user_id, day);

-- ---------- supplements & hydration ----------
create table public.supplement_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('protein','creatine','other')),
  brand text, name text not null, scoop_g numeric not null,
  kcal numeric not null default 0, protein_g numeric not null default 0, carbs_g numeric not null default 0, fat_g numeric not null default 0,
  daily_target numeric not null, unit text not null check (unit in ('scoop','g')), quick numeric[] not null,
  archived boolean not null default false
);

-- Only 'protein' products contribute to nutrition totals (computed in the app).
create table public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_id uuid not null references public.supplement_products on delete cascade,
  day date not null, amount numeric not null check (amount > 0), logged_at timestamptz not null default now()
);

create table public.hydration_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null, ml int not null, note text, logged_at timestamptz not null default now()
);

create table public.challenge_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  challenge_id uuid not null references public.challenges on delete cascade,
  day date not null, amount int not null, logged_at timestamptz not null default now()
);

-- ---------- body & progress ----------
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null, weight_kg numeric(5,1), waist_cm numeric(5,1), body_fat_pct numeric(4,1),
  unique (user_id, day)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null, storage_path text not null   -- private bucket, signed URLs only
);

-- ---------- AI usage limits ----------
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date, calls int not null default 0,
  primary key (user_id, day)
);

-- ---------- row-level security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','goals','macro_targets','dashboard_configs','challenges','workout_templates',
    'workout_schedule','workout_sessions','completed_sets','sport_sessions','meals','food_entries',
    'supplement_products','supplement_logs','hydration_entries','challenge_logs','body_measurements',
    'progress_photos','ai_usage']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ai_usage is written only by the server function (service role).
drop policy "own rows" on public.ai_usage;
create policy "read own usage" on public.ai_usage for select using (user_id = auth.uid());

alter table public.template_exercises enable row level security;
create policy "own template rows" on public.template_exercises for all
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));

-- Global library rows are readable by everyone; custom rows only by their owner.
alter table public.exercises enable row level security;
create policy "read library or own" on public.exercises for select using (user_id is null or user_id = auth.uid());
create policy "write own" on public.exercises for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.foods enable row level security;
create policy "read shared or own" on public.foods for select using (user_id is null or user_id = auth.uid());
create policy "write own" on public.foods for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Account deletion: deleting the auth user cascades to every table above.
