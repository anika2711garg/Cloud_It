-- Dual mode migration for existing AI Study Hub databases.
-- Run this in Supabase SQL editor if you already executed schema.sql before.

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

alter table public.quizzes
  add column if not exists is_published boolean not null default false;

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

alter table public.users enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

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
