-- New user -> profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Release inventory held by unpaid orders that timed out
create or replace function public.release_expired_orders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
begin
  for o in
    select id from public.orders
    where status = 'pending' and expires_at < now()
    for update skip locked
  loop
    update public.ticket_types tt
       set quantity_held = greatest(tt.quantity_held - oi.quantity, 0)
      from public.order_items oi
     where oi.order_id = o.id and tt.id = oi.ticket_type_id;

    update public.orders set status = 'expired' where id = o.id;
  end loop;
end;
$$;

-- Create a pending order and hold inventory atomically (no overselling)
create or replace function public.create_order(
  p_user_id uuid,
  p_email text,
  p_event_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events%rowtype;
  tt public.ticket_types%rowtype;
  it record;
  v_order_id uuid := gen_random_uuid();
  v_total bigint := 0;
begin
  perform public.release_expired_orders();

  select * into ev from public.events where id = p_event_id;
  if not found or ev.status <> 'published' then
    raise exception 'This event is not available';
  end if;
  if coalesce(ev.ends_at, ev.starts_at) < now() then
    raise exception 'This event has already ended';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No tickets selected';
  end if;

  insert into public.orders (id, user_id, event_id, email, total_minor, expires_at, payment_reference)
  values (v_order_id, p_user_id, p_event_id, p_email, 0, now() + interval '15 minutes',
          'ord_' || replace(v_order_id::text, '-', ''));

  for it in
    select (x->>'ticket_type_id')::uuid as ticket_type_id,
           (x->>'quantity')::int as quantity
      from jsonb_array_elements(p_items) x
     order by ticket_type_id
  loop
    if it.quantity is null or it.quantity < 1 then
      raise exception 'Invalid quantity';
    end if;

    select * into tt
      from public.ticket_types
     where id = it.ticket_type_id and event_id = p_event_id
       for update;
    if not found then
      raise exception 'Ticket type not found';
    end if;
    if it.quantity > tt.max_per_order then
      raise exception 'You can buy at most % "%" tickets per order', tt.max_per_order, tt.name;
    end if;
    if tt.sales_start is not null and tt.sales_start > now() then
      raise exception 'Sales have not started for "%"', tt.name;
    end if;
    if tt.sales_end is not null and tt.sales_end < now() then
      raise exception 'Sales have ended for "%"', tt.name;
    end if;
    if tt.quantity_total - tt.quantity_sold - tt.quantity_held < it.quantity then
      raise exception 'Not enough "%" tickets left', tt.name;
    end if;

    update public.ticket_types
       set quantity_held = quantity_held + it.quantity
     where id = tt.id;

    insert into public.order_items (order_id, ticket_type_id, quantity, unit_price_minor)
    values (v_order_id, tt.id, it.quantity, tt.price_minor);

    v_total := v_total + tt.price_minor::bigint * it.quantity;
  end loop;

  update public.orders set total_minor = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

-- Mark an order paid and issue tickets. Safe to call more than once.
create or replace function public.fulfill_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  tt public.ticket_types%rowtype;
  it public.order_items%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if o.status in ('paid', 'refund_needed') then
    return o.status;
  end if;

  -- Payment arrived after the hold was released: try to take the seats again.
  if o.status in ('expired', 'failed') then
    for it in select * from public.order_items where order_id = o.id order by ticket_type_id loop
      select * into tt from public.ticket_types where id = it.ticket_type_id for update;
      if tt.quantity_total - tt.quantity_sold - tt.quantity_held < it.quantity then
        update public.orders set status = 'refund_needed' where id = o.id;
        return 'refund_needed';
      end if;
    end loop;
    update public.ticket_types t
       set quantity_held = t.quantity_held + oi.quantity
      from public.order_items oi
     where oi.order_id = o.id and t.id = oi.ticket_type_id;
  end if;

  for it in select * from public.order_items where order_id = o.id order by ticket_type_id loop
    update public.ticket_types
       set quantity_held = greatest(quantity_held - it.quantity, 0),
           quantity_sold = quantity_sold + it.quantity
     where id = it.ticket_type_id;

    insert into public.tickets (order_id, event_id, ticket_type_id, owner_id)
    select o.id, o.event_id, it.ticket_type_id, o.user_id
      from generate_series(1, it.quantity);
  end loop;

  update public.orders set status = 'paid', paid_at = now() where id = o.id;
  return 'paid';
end;
$$;

-- Only the server (service role) may run these
revoke execute on function public.release_expired_orders() from public, anon, authenticated;
revoke execute on function public.create_order(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.fulfill_order(uuid) from public, anon, authenticated;
grant execute on function public.release_expired_orders() to service_role;
grant execute on function public.create_order(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.fulfill_order(uuid) to service_role;
