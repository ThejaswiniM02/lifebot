-- Categories are a fixed set matching Tej's tracks
create type task_category as enum (
  'coding_skills', 'dsa', 'ui_ux', 'burnout_app', 'job_applications', 'other'
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  category task_category not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_min int,
  completed boolean,          -- true = finished naturally, false = abandoned early
  note text,
  energy_after int check (energy_after between 1 and 5),
  created_at timestamptz default now()
);

create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  feeling_morning text,
  feeling_prev_evening text,
  slept_ok boolean,
  notes text,
  created_at timestamptz default now()
);

create table daily_plans (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  planned_order jsonb,   -- e.g. ["dsa","job_applications","coding_skills"]
  actual_order jsonb,
  reasoning text,        -- coach's stated reasoning, kept for later review
  created_at timestamptz default now()
);

-- Helpful view: continuation rate per category
create view category_stats as
select
  category,
  count(*) filter (where completed = true)::float / nullif(count(*) filter (where completed is not null), 0) as continuation_rate,
  avg(duration_min) as avg_duration_min,
  count(*) as total_sessions
from sessions
group by category;
