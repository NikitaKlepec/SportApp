-- ============================================================
-- Схема БД для приложения "Домашние тренировки"
-- Выполнить в Supabase: SQL Editor -> New query -> вставить -> Run
-- ============================================================

-- Группы мышц (справочник)
create table muscle_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,      -- напр. "Ноги", "Спина", "Грудь"
  color text not null default '#C6FF33', -- цвет для подсветки на схеме тела и полосы карточки
  svg_region_ids text[] not null default '{}' -- id зон в SVG-схеме тела, которые подсвечиваются
);

-- Упражнения
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  muscle_group_id uuid references muscle_groups(id) on delete set null,
  image_url text,          -- фото упражнения (Supabase Storage)
  video_url text,          -- ссылка (YouTube) или путь в Storage
  video_source text check (video_source in ('upload', 'youtube')) default 'upload',
  equipment text,          -- напр. "гантели", "без инвентаря"
  created_at timestamptz default now()
);

-- Программы тренировок (шаблоны, переиспользуемые)
create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz default now()
);

-- Упражнения внутри программы
create table program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  sets integer not null default 3,
  reps integer not null default 12,
  weight numeric,             -- в кг, может быть пустым (упражнения с весом тела)
  rest_seconds integer not null default 60,
  order_index integer not null default 0
);

-- Назначение программы на конкретный день календаря
create table calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  program_id uuid references programs(id) on delete set null,
  unique (user_id, date)
);

-- Факт выполнения тренировки в конкретный день
create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_entry_id uuid references calendar_entries(id) on delete cascade,
  date date not null,
  status text check (status in ('done', 'skipped', 'in_progress')) default 'in_progress',
  completed_at timestamptz
);

-- Фактически выполненные подходы по каждому упражнению в рамках лога
create table workout_log_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  actual_sets integer,
  actual_reps integer,
  actual_weight numeric,
  order_index integer not null default 0
);

-- ============================================================
-- Row Level Security: каждый пользователь видит только свои данные
-- ============================================================
alter table exercises enable row level security;
alter table programs enable row level security;
alter table program_exercises enable row level security;
alter table calendar_entries enable row level security;
alter table workout_logs enable row level security;
alter table workout_log_entries enable row level security;

create policy "own exercises" on exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own programs" on programs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own calendar" on calendar_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs" on workout_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- program_exercises и workout_log_entries защищены через родителя (program/log),
-- поэтому проверяем владение через join
create policy "own program_exercises" on program_exercises for all
  using (exists (select 1 from programs p where p.id = program_id and p.user_id = auth.uid()))
  with check (exists (select 1 from programs p where p.id = program_id and p.user_id = auth.uid()));

create policy "own log_entries" on workout_log_entries for all
  using (exists (select 1 from workout_logs w where w.id = log_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workout_logs w where w.id = log_id and w.user_id = auth.uid()));

-- muscle_groups — общий справочник, читать могут все авторизованные
alter table muscle_groups enable row level security;
create policy "read muscle groups" on muscle_groups for select using (auth.role() = 'authenticated');

-- Стартовые группы мышц
insert into muscle_groups (name, color, svg_region_ids) values
  ('Ноги', '#4C9F70', '{legs_front,legs_back}'),
  ('Спина', '#3E7CB1', '{back}'),
  ('Грудь', '#D9634B', '{chest}'),
  ('Руки', '#B18AD9', '{arms_left,arms_right}'),
  ('Плечи', '#E0B23E', '{shoulders}'),
  ('Пресс', '#C6FF33', '{abs}');
