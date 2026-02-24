-- Lightweight analytics: fire-and-forget event logging from the iOS client.
-- Query via Supabase dashboard / SQL editor (no client-side SELECT).

create table if not exists analytics_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users on delete set null,
  event      text not null,
  properties jsonb default '{}',
  created_at timestamptz default now()
);

-- Per-user timeline (e.g. onboarding funnel for a single user)
create index idx_analytics_user_created
  on analytics_events (user_id, created_at desc);

-- Aggregate queries (e.g. all paywall_shown events this week)
create index idx_analytics_event_created
  on analytics_events (event, created_at desc);

-- RLS: clients can INSERT their own events, nothing else.
alter table analytics_events enable row level security;

create policy "Users can insert their own events"
  on analytics_events for insert
  with check (auth.uid() = user_id);
