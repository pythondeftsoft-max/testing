
create table public.worker_time_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.worker_time_entries enable row level security;

create policy "Authenticated users can read all time entries"
  on public.worker_time_entries for select
  to authenticated
  using (true);

create policy "Users can insert own time entries"
  on public.worker_time_entries for insert
  to authenticated
  with check (worker_id = auth.uid());

create policy "Users can update own time entries"
  on public.worker_time_entries for update
  to authenticated
  using (worker_id = auth.uid());

create index idx_worker_time_entries_worker on public.worker_time_entries(worker_id);
create index idx_worker_time_entries_clock_in on public.worker_time_entries(clock_in);
