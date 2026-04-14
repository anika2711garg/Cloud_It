-- AI Study Hub schema for Supabase SQL editor
-- Execute this script in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- Public mirror of auth users for easier querying.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  role text not null default 'student' check (role in ('teacher', 'student'))
);

alter table public.users
  add column if not exists role text not null default 'student';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check check (role in ('teacher', 'student'));
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    case
      when coalesce(new.raw_user_meta_data->>'role', '') = 'teacher' then 'teacher'
      else 'student'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  folder_id uuid references public.folders (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_id uuid references public.subjects (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.quizzes
  add column if not exists is_published boolean not null default false;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

-- Generic owner-only access policies.
drop policy if exists "users_can_read_self" on public.users;
drop policy if exists "users_self_select" on public.users;
drop policy if exists "users_self_insert" on public.users;
drop policy if exists "users_self_update" on public.users;
create policy "users_self_select"
on public.users for select
using (auth.uid() = id);

create policy "users_self_insert"
on public.users for insert
with check (auth.uid() = id);

create policy "users_self_update"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "subjects_owner_all" on public.subjects;
create policy "subjects_owner_all"
on public.subjects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "folders_owner_all" on public.folders;
create policy "folders_owner_all"
on public.folders for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "files_owner_all" on public.files;
create policy "files_owner_all"
on public.files for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "quizzes_owner_all" on public.quizzes;
drop policy if exists "quizzes_select_visible" on public.quizzes;
drop policy if exists "quizzes_insert_owner" on public.quizzes;
drop policy if exists "quizzes_update_owner" on public.quizzes;
drop policy if exists "quizzes_delete_owner" on public.quizzes;
create policy "quizzes_select_visible"
on public.quizzes for select
using (auth.uid() = user_id or is_published = true);

create policy "quizzes_insert_owner"
on public.quizzes for insert
with check (auth.uid() = user_id);

create policy "quizzes_update_owner"
on public.quizzes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "quizzes_delete_owner"
on public.quizzes for delete
using (auth.uid() = user_id);

drop policy if exists "questions_owner_all" on public.questions;
drop policy if exists "questions_select_visible" on public.questions;
drop policy if exists "questions_insert_owner" on public.questions;
drop policy if exists "questions_update_owner" on public.questions;
drop policy if exists "questions_delete_owner" on public.questions;
create policy "questions_select_visible"
on public.questions for select
using (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id
      and (q.user_id = auth.uid() or q.is_published = true)
  )
);

create policy "questions_insert_owner"
on public.questions for insert
with check (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id and q.user_id = auth.uid()
  )
);

create policy "questions_update_owner"
on public.questions for update
using (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id and q.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id and q.user_id = auth.uid()
  )
);

create policy "questions_delete_owner"
on public.questions for delete
using (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id and q.user_id = auth.uid()
  )
);

drop policy if exists "attempts_owner_all" on public.attempts;
drop policy if exists "attempts_select_owner" on public.attempts;
drop policy if exists "attempts_insert_owner" on public.attempts;
drop policy if exists "attempts_update_owner" on public.attempts;
drop policy if exists "attempts_delete_owner" on public.attempts;
create policy "attempts_select_owner"
on public.attempts for select
using (auth.uid() = user_id);

create policy "attempts_insert_owner"
on public.attempts for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.quizzes q
    where q.id = attempts.quiz_id
      and (q.user_id = auth.uid() or q.is_published = true)
  )
);

create policy "attempts_update_owner"
on public.attempts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "attempts_delete_owner"
on public.attempts for delete
using (auth.uid() = user_id);

-- Storage setup
insert into storage.buckets (id, name, public)
values ('study-files', 'study-files', true)
on conflict (id) do nothing;

-- Files can be uploaded/read only by authenticated users under their own folder prefix.
drop policy if exists "study_files_insert" on storage.objects;
create policy "study_files_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'study-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "study_files_select" on storage.objects;
create policy "study_files_select"
on storage.objects for select to authenticated
using (bucket_id = 'study-files');

drop policy if exists "study_files_update" on storage.objects;
create policy "study_files_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'study-files'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'study-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "study_files_delete" on storage.objects;
create policy "study_files_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'study-files'
  and split_part(name, '/', 1) = auth.uid()::text
);
