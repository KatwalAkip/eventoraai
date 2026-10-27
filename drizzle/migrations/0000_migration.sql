create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  event_type text not null check (event_type in ('wedding','birthday','anniversary','community','corporate','other')),
  event_date date not null,
  start_time text,
  duration_hours numeric not null default 4 check (duration_hours > 0 and duration_hours <= 240),
  location text not null default '' check (char_length(location) <= 200),
  guest_count integer not null check (guest_count between 1 and 100000),
  total_budget numeric(14,2) not null check (total_budget >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  contingency_pct numeric not null default 10 check (contingency_pct between 0 and 50),
  theme text not null default '' check (char_length(theme) <= 200),
  colors text not null default '' check (char_length(colors) <= 200),
  atmosphere text not null default '' check (char_length(atmosphere) <= 200),
  food_preferences text not null default '' check (char_length(food_preferences) <= 500),
  venue_preference text not null default 'either' check (venue_preference in ('indoor','outdoor','either')),
  accessibility text not null default '' check (char_length(accessibility) <= 500),
  special_requests text not null default '' check (char_length(special_requests) <= 1000),
  status text not null default 'planning' check (status in ('draft','planning','completed')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "own events select" on public.events for select to authenticated using (auth.uid() = user_id);
create policy "own events insert" on public.events for insert to authenticated with check (auth.uid() = user_id);
create policy "own events update" on public.events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events delete" on public.events for delete to authenticated using (auth.uid() = user_id);
create index on public.events(user_id, event_date);

create or replace function public.event_owned(_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = _event and user_id = auth.uid())
$$;
grant execute on function public.event_owned(uuid) to authenticated;

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 60),
  allocated numeric(14,2) not null default 0 check (allocated >= 0),
  spent numeric(14,2) not null default 0 check (spent >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  title text not null check (char_length(title) between 1 and 200),
  phase text not null default 'planning',
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('venue','catering','decoration','photography','entertainment','transport','other')),
  contact text not null default '' check (char_length(contact) <= 200),
  estimated_cost numeric(14,2) not null default 0 check (estimated_cost >= 0),
  booking_status text not null default 'researching' check (booking_status in ('researching','shortlisted','booked','declined')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','deposit','paid')),
  rating integer check (rating between 1 and 5),
  notes text not null default '' check (char_length(notes) <= 1000),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.saved_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  event_id uuid references public.events(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'general',
  estimated_cost text not null default '',
  created_at timestamptz not null default now()
);
create table public.ai_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  plan jsonb not null,
  source text not null check (source in ('ai','demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['budget_categories','tasks','vendors','ai_plans'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own insert" on public.%I for insert to authenticated with check (auth.uid() = user_id and public.event_owned(event_id))', t);
    execute format('create policy "own update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and public.event_owned(event_id))', t);
    execute format('create policy "own delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
    execute format('create index on public.%I(event_id)', t);
  end loop;
end $$;

grant select, insert, update, delete on public.saved_ideas to authenticated;
grant all on public.saved_ideas to service_role;
alter table public.saved_ideas enable row level security;
create policy "own select" on public.saved_ideas for select to authenticated using (auth.uid() = user_id);
create policy "own insert" on public.saved_ideas for insert to authenticated with check (auth.uid() = user_id and (event_id is null or public.event_owned(event_id)));
create policy "own update" on public.saved_ideas for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.saved_ideas for delete to authenticated using (auth.uid() = user_id);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
grant all on public.ai_usage to service_role;
grant select, insert on public.ai_usage to authenticated;
alter table public.ai_usage enable row level security;
create policy "own usage select" on public.ai_usage for select to authenticated using (auth.uid() = user_id);
create policy "own usage insert" on public.ai_usage for insert to authenticated with check (auth.uid() = user_id);
create index on public.ai_usage(user_id, created_at);