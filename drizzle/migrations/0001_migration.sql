alter table public.tasks add column offset_days integer;
alter table public.tasks add column notes text not null default '' check (char_length(notes) <= 1000);