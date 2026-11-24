-- Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 150),
  slug text not null unique,
  description text,
  venue text not null,
  city text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  image_url text,
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  price_minor integer not null default 0 check (price_minor >= 0 and price_minor <= 1000000000),
  currency text not null default 'NGN',
  quantity_total integer not null check (quantity_total >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  quantity_held integer not null default 0 check (quantity_held >= 0),
  max_per_order integer not null default 10 check (max_per_order between 1 and 20),
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz not null default now(),
  check (quantity_sold + quantity_held <= quantity_total)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  email text not null,
  status text not null default 'pending' check (status in ('pending','paid','expired','failed','refund_needed')),
  total_minor bigint not null check (total_minor >= 0),
  currency text not null default 'NGN',
  payment_reference text unique,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_minor integer not null check (unit_price_minor >= 0)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  status text not null default 'valid' check (status in ('valid','used','cancelled')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes on foreign keys and common filters
create index events_status_starts_idx on public.events (status, starts_at);
create index events_organizer_idx on public.events (organizer_id);
create index ticket_types_event_idx on public.ticket_types (event_id);
create index orders_user_idx on public.orders (user_id);
create index orders_event_idx on public.orders (event_id);
create index orders_status_expires_idx on public.orders (status, expires_at);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_ticket_type_idx on public.order_items (ticket_type_id);
create index tickets_owner_idx on public.tickets (owner_id);
create index tickets_event_idx on public.tickets (event_id);
create index tickets_order_idx on public.tickets (order_id);
create index tickets_ticket_type_idx on public.tickets (ticket_type_id);

-- Row level security
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;

-- Explicit grants (start from nothing, then add exactly what is needed)
revoke all on public.profiles, public.events, public.ticket_types, public.orders, public.order_items, public.tickets from anon, authenticated;

grant select, update (full_name) on public.profiles to authenticated;

grant select on public.events to anon, authenticated;
grant insert (organizer_id, title, slug, description, venue, city, starts_at, ends_at, image_url, status) on public.events to authenticated;
grant update (title, description, venue, city, starts_at, ends_at, image_url, status) on public.events to authenticated;

grant select on public.ticket_types to anon, authenticated;
grant insert (event_id, name, description, price_minor, quantity_total, max_per_order, sales_start, sales_end) on public.ticket_types to authenticated;
grant update (name, description, price_minor, quantity_total, max_per_order, sales_start, sales_end) on public.ticket_types to authenticated;

grant select on public.orders, public.order_items to authenticated;

grant select on public.tickets to authenticated;
grant update (status, checked_in_at) on public.tickets to authenticated;

-- profiles
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- events (the two select policies are merged in migration 4)
create policy "Anyone reads published events" on public.events
  for select to anon, authenticated using (status = 'published');
create policy "Organizers read own events" on public.events
  for select to authenticated using (organizer_id = (select auth.uid()));
create policy "Users create own events" on public.events
  for insert to authenticated with check (organizer_id = (select auth.uid()));
create policy "Organizers update own events" on public.events
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

-- ticket_types (the subquery on events is itself filtered by events RLS, so
-- ticket types are visible only for published events or the organizer's own)
create policy "Read ticket types of visible events" on public.ticket_types
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = ticket_types.event_id));
create policy "Organizers add ticket types" on public.ticket_types
  for insert to authenticated
  with check (exists (select 1 from public.events e where e.id = ticket_types.event_id and e.organizer_id = (select auth.uid())));
create policy "Organizers edit ticket types" on public.ticket_types
  for update to authenticated
  using (exists (select 1 from public.events e where e.id = ticket_types.event_id and e.organizer_id = (select auth.uid())))
  with check (exists (select 1 from public.events e where e.id = ticket_types.event_id and e.organizer_id = (select auth.uid())));

-- orders and items: buyer or the event's organizer can read; writes only via server functions
create policy "Buyers and organizers read orders" on public.orders
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.events e where e.id = orders.event_id and e.organizer_id = (select auth.uid()))
  );
create policy "Read items of visible orders" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

-- tickets
create policy "Owners and organizers read tickets" on public.tickets
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.events e where e.id = tickets.event_id and e.organizer_id = (select auth.uid()))
  );
create policy "Organizers check in tickets" on public.tickets
  for update to authenticated
  using (exists (select 1 from public.events e where e.id = tickets.event_id and e.organizer_id = (select auth.uid())))
  with check (exists (select 1 from public.events e where e.id = tickets.event_id and e.organizer_id = (select auth.uid())));
