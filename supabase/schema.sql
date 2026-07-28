-- Nadiak: run this complete script once in Supabase SQL Editor.
-- It is safe to run after the first version: all destructive changes are avoided.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'coach', 'investor', 'customer');
exception when duplicate_object then null; end $$;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(), full_name text not null, phone text,
  plan_name text not null default 'باقة لياقة شهرية', training_schedule text not null default '3 حصص أسبوعياً',
  membership_status text not null default 'نشط', renewal_date date, monthly_fee numeric(14,2) not null default 0 check (monthly_fee >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(), full_name text not null, job_title text not null,
  compensation_type text not null, monthly_amount numeric(14,2) not null default 0 check (monthly_amount >= 0),
  employment_status text not null default 'نشط', created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, role public.app_role not null default 'customer',
  staff_id uuid references public.staff(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  active boolean not null default true, created_at timestamptz not null default now(),
  constraint profile_role_link check (
    (role = 'coach' and staff_id is not null) or
    (role = 'customer' and member_id is not null) or
    role in ('admin', 'investor')
  )
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), name text not null, coach_id uuid references public.staff(id) on delete set null,
  schedule text not null, monthly_price numeric(14,2) not null default 0 check (monthly_price >= 0), capacity integer not null default 20 check (capacity > 0),
  status text not null default 'نشط', created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null, start_date date not null default current_date,
  end_date date not null, status text not null default 'نشط', amount numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(), constraint subscription_dates check (end_date >= start_date)
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique default ('INV-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  member_id uuid references public.members(id) on delete set null, title text not null, total numeric(14,2) not null check (total > 0),
  status text not null default 'issued' check (status in ('issued', 'paid', 'void')), due_date date, issued_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null, invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0), method text not null default 'نقدي', paid_at timestamptz not null default now(),
  idempotency_key text unique, invoice_number text unique default ('PAY-' || upper(substr(gen_random_uuid()::text, 1, 8)))
);
create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  weight numeric(6,2) check (weight > 0), notes text, logged_at timestamptz not null default now()
);
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  waist_cm numeric(6,2) check (waist_cm > 0), hip_cm numeric(6,2) check (hip_cm > 0), body_fat_percent numeric(5,2) check (body_fat_percent between 0 and 100), measured_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null, description text, image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0), cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0), active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(), receipt_number text not null unique default ('SALE-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  customer_id uuid references public.members(id) on delete set null, total numeric(14,2) not null check (total > 0), payment_method text not null default 'نقدي',
  idempotency_key text unique, sold_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id), quantity integer not null check (quantity > 0), unit_price numeric(14,2) not null check (unit_price >= 0), unit_cost numeric(14,2) not null check (unit_cost >= 0)
);
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(), name text not null, description text, asset_type text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0), status text not null default 'نشط', created_at timestamptz not null default now()
);
create table if not exists public.finance_movements (
  id uuid primary key default gen_random_uuid(), title text not null, account_name text not null,
  category text not null, amount numeric(14,2) not null check (amount > 0), direction text not null check (direction in ('in', 'out')),
  payment_method text not null default 'نقدي', source_type text, source_id uuid, idempotency_key text unique,
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.profit_shares (
  id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete set null,
  recipient_name text not null, recipient_role public.app_role not null, share_percent numeric(5,2) not null check (share_percent > 0 and share_percent <= 100),
  effective_from date not null default current_date, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(), profit_share_id uuid not null references public.profit_shares(id),
  period_start date not null, period_end date not null, profit_base numeric(14,2) not null check (profit_base >= 0),
  amount numeric(14,2) not null check (amount >= 0), status text not null default 'due' check (status in ('due', 'paid', 'cancelled')),
  paid_at timestamptz, created_at timestamptz not null default now(), constraint distribution_period check (period_end >= period_start),
  unique (profit_share_id, period_start, period_end)
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(), key text not null unique, value text not null default '', description text, created_at timestamptz not null default now()
);

-- Forward-compatible upgrades for projects that ran the first schema version.
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists active boolean not null default true;
alter table public.payments add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.payments add column if not exists idempotency_key text;
create unique index if not exists payments_idempotency_key_idx on public.payments (idempotency_key) where idempotency_key is not null;
alter table public.finance_movements add column if not exists source_type text;
alter table public.finance_movements add column if not exists source_id uuid;
alter table public.finance_movements add column if not exists idempotency_key text;
create unique index if not exists finance_movements_idempotency_key_idx on public.finance_movements (idempotency_key) where idempotency_key is not null;

-- Complete, forward-compatible domain fields.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.members add column if not exists member_code text unique;
alter table public.members add column if not exists whatsapp text;
alter table public.members add column if not exists gender text;
alter table public.members add column if not exists birth_date date;
alter table public.members add column if not exists address text;
alter table public.members add column if not exists emergency_contact text;
alter table public.members add column if not exists join_date date not null default current_date;
alter table public.members add column if not exists avatar_url text;
alter table public.members add column if not exists goals text;
alter table public.members add column if not exists medical_note text;
alter table public.members add column if not exists assigned_coach_id uuid references public.staff(id) on delete set null;
alter table public.staff add column if not exists staff_code text unique;
alter table public.staff add column if not exists phone text;
alter table public.staff add column if not exists email text;
alter table public.staff add column if not exists avatar_url text;
alter table public.staff add column if not exists specialties text;
alter table public.staff add column if not exists hire_date date;
alter table public.staff add column if not exists notes text;
alter table public.courses add column if not exists course_code text unique;
alter table public.courses add column if not exists category text;
alter table public.courses add column if not exists short_description text;
alter table public.courses add column if not exists full_description text;
alter table public.courses add column if not exists level text;
alter table public.courses add column if not exists duration_days integer;
alter table public.courses add column if not exists sessions_per_week integer;
alter table public.courses add column if not exists start_date date;
alter table public.courses add column if not exists end_date date;
alter table public.courses add column if not exists cover_image_url text;

create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  coach_id uuid references public.staff(id) on delete set null, day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null, end_time time not null, room text, created_at timestamptz not null default now(), check (end_time > start_time)
);
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade, session_id uuid references public.course_sessions(id) on delete set null,
  attended_at timestamptz not null default now(), status text not null default 'حاضر' check (status in ('حاضر','غائب','معتذر','متأخر')),
  recorded_by uuid references public.profiles(id) on delete set null
);
create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  coach_id uuid references public.staff(id) on delete set null, note text not null, visibility text not null default 'coach' check (visibility in ('coach','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.coach_payouts (
  id uuid primary key default gen_random_uuid(), staff_id uuid not null references public.staff(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0), method text not null default 'نقدي', paid_at timestamptz not null default now(),
  finance_movement_id uuid references public.finance_movements(id) on delete set null, note text, created_at timestamptz not null default now()
);
create index if not exists attendance_member_idx on public.attendance(member_id, attended_at desc);
create unique index if not exists attendance_session_day_unique_idx on public.attendance(member_id, session_id, ((attended_at at time zone 'UTC')::date)) where session_id is not null;
create index if not exists course_sessions_course_idx on public.course_sessions(course_id, day_of_week);

-- A renewal is one database transaction: subscription, invoice, payment, ledger and audit log succeed together.
create or replace function public.renew_membership(p_member_id uuid, p_course_id uuid, p_end_date date, p_amount numeric, p_paid boolean, p_method text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare subscription_id uuid; invoice_id uuid; payment_id uuid; movement_id uuid;
begin
  if p_amount <= 0 or p_end_date < current_date then raise exception 'Invalid renewal values'; end if;
  if p_idempotency_key is not null and exists(select 1 from public.payments where idempotency_key = p_idempotency_key) then
    select subscription_id, invoice_id, id into subscription_id, invoice_id, payment_id from public.payments where idempotency_key = p_idempotency_key;
    return jsonb_build_object('subscription_id',subscription_id,'invoice_id',invoice_id,'payment_id',payment_id,'idempotent',true);
  end if;
  insert into public.subscriptions(member_id, course_id, start_date, end_date, status, amount)
  values(p_member_id, p_course_id, current_date, p_end_date, case when p_paid then 'نشط' else 'بانتظار الدفع' end, p_amount) returning id into subscription_id;
  insert into public.invoices(member_id, title, total, status, due_date)
  values(p_member_id, 'تجديد اشتراك', p_amount, case when p_paid then 'paid' else 'issued' end, current_date) returning id into invoice_id;
  if p_paid then
    insert into public.payments(member_id, subscription_id, invoice_id, amount, method, idempotency_key)
    values(p_member_id, subscription_id, invoice_id, p_amount, coalesce(p_method,'نقدي'), p_idempotency_key) returning id into payment_id;
    insert into public.finance_movements(title, account_name, category, amount, direction, payment_method, source_type, source_id, idempotency_key)
    values('تجديد اشتراك','اشتراكات المتدربين','اشتراكات',p_amount,'in',coalesce(p_method,'نقدي'),'payment',payment_id,p_idempotency_key) returning id into movement_id;
  end if;
  update public.members set renewal_date = p_end_date, membership_status = case when p_paid then 'نشط' else 'بانتظار الدفع' end where id = p_member_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(null,'renew_membership','members',p_member_id,jsonb_build_object('subscription_id',subscription_id,'invoice_id',invoice_id,'payment_id',payment_id,'movement_id',movement_id));
  return jsonb_build_object('subscription_id',subscription_id,'invoice_id',invoice_id,'payment_id',payment_id,'movement_id',movement_id,'idempotent',false);
end; $$;

create index if not exists finance_movements_occurred_at_idx on public.finance_movements (occurred_at desc);
create index if not exists members_status_idx on public.members (membership_status);
create index if not exists subscriptions_member_status_idx on public.subscriptions (member_id, status, end_date);
create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- Database-side guard: the active distribution model can never exceed 100%.
create or replace function public.validate_profit_shares() returns trigger language plpgsql as $$
declare share_total numeric;
begin
  select coalesce(sum(share_percent), 0) into share_total from public.profit_shares
  where active = true and effective_from = new.effective_from and id <> coalesce(new.id, gen_random_uuid());
  if new.active and share_total + new.share_percent > 100 then
    raise exception 'Total active profit shares cannot exceed 100 percent';
  end if;
  return new;
end; $$;
drop trigger if exists validate_profit_shares_trigger on public.profit_shares;
create trigger validate_profit_shares_trigger before insert or update on public.profit_shares for each row execute function public.validate_profit_shares();

-- Atomic checkout: locks stock, records a sale, lowers stock, then creates its financial receipt.
create or replace function public.create_sale(p_customer_id uuid, p_items jsonb, p_payment_method text, p_idempotency_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sale_id uuid; item jsonb; product_record public.products%rowtype; total_amount numeric := 0; caller_role public.app_role; caller_member_id uuid;
begin
  caller_role := public.current_role();
  if caller_role not in ('customer', 'admin') then raise exception 'Only customers and admins can create sales'; end if;
  if caller_role = 'customer' then
    select member_id into caller_member_id from public.profiles where id = auth.uid();
    if caller_member_id is null then raise exception 'Customer account is not linked to a member'; end if;
    if p_customer_id is null then p_customer_id := caller_member_id; end if;
    if p_customer_id <> caller_member_id then raise exception 'Customer cannot create a sale for another member'; end if;
  end if;
  if p_idempotency_key is not null and exists(select 1 from public.sales where idempotency_key = p_idempotency_key) then
    return (select id from public.sales where idempotency_key = p_idempotency_key);
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Sale needs at least one item'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into product_record from public.products where id = (item->>'product_id')::uuid and active = true for update;
    if not found then raise exception 'Product is not available'; end if;
    if product_record.stock_quantity < (item->>'quantity')::integer then raise exception 'Insufficient stock for %', product_record.name; end if;
    total_amount := total_amount + product_record.sale_price * (item->>'quantity')::integer;
  end loop;
  insert into public.sales(customer_id,total,payment_method,idempotency_key) values(p_customer_id,total_amount,p_payment_method,p_idempotency_key) returning id into sale_id;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into product_record from public.products where id = (item->>'product_id')::uuid for update;
    if not found or not product_record.active then raise exception 'Product is not available'; end if;
    if product_record.stock_quantity < (item->>'quantity')::integer then raise exception 'Insufficient stock for %', product_record.name; end if;
    insert into public.sale_items(sale_id,product_id,quantity,unit_price,unit_cost) values(sale_id,product_record.id,(item->>'quantity')::integer,product_record.sale_price,product_record.cost_price);
    update public.products set stock_quantity = stock_quantity - (item->>'quantity')::integer where id = product_record.id;
  end loop;
  insert into public.finance_movements(title,account_name,category,amount,direction,payment_method,source_type,source_id,idempotency_key)
  values('بيع متجر','مبيعات المتجر','مبيعات المتجر',total_amount,'in',p_payment_method,'sale',sale_id,p_idempotency_key);
  return sale_id;
end; $$;

-- Admins can read everything. A signed-in coach/customer sees only their linked data; investors read audited finance.
create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select public.current_role() = 'admin' $$;
create or replace function public.is_investor() returns boolean language sql stable security definer set search_path = public as $$ select public.current_role() = 'investor' $$;

alter table public.members enable row level security; alter table public.staff enable row level security; alter table public.profiles enable row level security;
alter table public.courses enable row level security; alter table public.subscriptions enable row level security; alter table public.invoices enable row level security;
alter table public.payments enable row level security; alter table public.progress_logs enable row level security; alter table public.measurements enable row level security;
alter table public.products enable row level security; alter table public.sales enable row level security; alter table public.sale_items enable row level security;
alter table public.assets enable row level security; alter table public.finance_movements enable row level security; alter table public.profit_shares enable row level security;
alter table public.distributions enable row level security; alter table public.audit_logs enable row level security; alter table public.app_settings enable row level security;
alter table public.course_sessions enable row level security; alter table public.attendance enable row level security; alter table public.member_notes enable row level security; alter table public.coach_payouts enable row level security;

drop policy if exists product_catalog_read on public.products; create policy product_catalog_read on public.products for select using (active or public.is_admin());
drop policy if exists own_profile_read on public.profiles; create policy own_profile_read on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists admin_profiles_write on public.profiles; create policy admin_profiles_write on public.profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_full_members on public.members; create policy admin_full_members on public.members for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists customer_own_member on public.members; create policy customer_own_member on public.members for select using (id = (select member_id from public.profiles where id = auth.uid()));
drop policy if exists admin_full_staff on public.staff; create policy admin_full_staff on public.staff for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_own_staff on public.staff; create policy coach_own_staff on public.staff for select using (id = (select staff_id from public.profiles where id = auth.uid()));
drop policy if exists admin_courses on public.courses; create policy admin_courses on public.courses for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_courses on public.courses; create policy coach_courses on public.courses for select using (coach_id = (select staff_id from public.profiles where id = auth.uid()));
drop policy if exists admin_finance on public.finance_movements;
drop policy if exists admin_finance_read on public.finance_movements; create policy admin_finance_read on public.finance_movements for select using (public.is_admin());
drop policy if exists admin_finance_insert on public.finance_movements; create policy admin_finance_insert on public.finance_movements for insert with check (public.is_admin());
drop policy if exists investor_finance_read on public.finance_movements; create policy investor_finance_read on public.finance_movements for select using (public.is_investor());
drop policy if exists customer_subscriptions_read on public.subscriptions; create policy customer_subscriptions_read on public.subscriptions for select using (member_id = (select member_id from public.profiles where id = auth.uid()));
drop policy if exists customer_payments_read on public.payments; create policy customer_payments_read on public.payments for select using (member_id = (select member_id from public.profiles where id = auth.uid()));
drop policy if exists customer_invoices_read on public.invoices; create policy customer_invoices_read on public.invoices for select using (member_id = (select member_id from public.profiles where id = auth.uid()));
drop policy if exists customer_progress_read on public.progress_logs; create policy customer_progress_read on public.progress_logs for select using (member_id = (select member_id from public.profiles where id = auth.uid()));
drop policy if exists customer_measurements_read on public.measurements; create policy customer_measurements_read on public.measurements for select using (member_id = (select member_id from public.profiles where id = auth.uid()));
drop policy if exists coach_course_subscriptions_read on public.subscriptions; create policy coach_course_subscriptions_read on public.subscriptions for select using (course_id in (select id from public.courses where coach_id = (select staff_id from public.profiles where id = auth.uid())));
drop policy if exists admin_all_subscriptions on public.subscriptions; create policy admin_all_subscriptions on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_all_invoices on public.invoices; create policy admin_all_invoices on public.invoices for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_all_payments on public.payments; create policy admin_all_payments on public.payments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_all_attendance on public.attendance; create policy admin_all_attendance on public.attendance for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_attendance_write on public.attendance; create policy coach_attendance_write on public.attendance for all using (course_id in (select id from public.courses where coach_id = (select staff_id from public.profiles where id = auth.uid()))) with check (course_id in (select id from public.courses where coach_id = (select staff_id from public.profiles where id = auth.uid())));
drop policy if exists admin_all_course_sessions on public.course_sessions; create policy admin_all_course_sessions on public.course_sessions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_course_sessions on public.course_sessions; create policy coach_course_sessions on public.course_sessions for select using (coach_id = (select staff_id from public.profiles where id = auth.uid()));
drop policy if exists admin_all_member_notes on public.member_notes; create policy admin_all_member_notes on public.member_notes for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_member_notes on public.member_notes; create policy coach_member_notes on public.member_notes for all using (coach_id = (select staff_id from public.profiles where id = auth.uid())) with check (coach_id = (select staff_id from public.profiles where id = auth.uid()));
drop policy if exists admin_all_payouts on public.coach_payouts; create policy admin_all_payouts on public.coach_payouts for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_own_payouts on public.coach_payouts; create policy coach_own_payouts on public.coach_payouts for select using (staff_id = (select staff_id from public.profiles where id = auth.uid()));
drop policy if exists investor_reports_read on public.profit_shares; create policy investor_reports_read on public.profit_shares for select using (public.is_investor() or public.is_admin());
drop policy if exists investor_distributions_read on public.distributions; create policy investor_distributions_read on public.distributions for select using (public.is_investor() or public.is_admin());
drop policy if exists investor_audit_read on public.audit_logs; create policy investor_audit_read on public.audit_logs for select using (public.is_investor() or public.is_admin());

revoke all on function public.create_sale(uuid,jsonb,text,text) from public;
grant execute on function public.create_sale(uuid,jsonb,text,text) to authenticated;
