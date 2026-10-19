-- Run once in Supabase → SQL Editor if new projects disappear after a reload.
-- Safe to run more than once.

-- New projects may leave 종료일 empty; without this the database rejects them.
alter table public.projects
  alter column end_date drop not null;
