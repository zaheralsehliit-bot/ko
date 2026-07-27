create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(), full_name text not null, phone text,
  plan_name text not null default 'باقة لياقة شهرية', training_schedule text not null default '3 حصص أسبوعيًا',
  membership_status text not null default 'نشط', renewal_date date, monthly_fee numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(), full_name text not null, job_title text not null,
  compensation_type text not null, monthly_amount numeric(14,2) not null default 0,
  employment_status text not null default 'نشط', created_at timestamptz not null default now()
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), name text not null, coach_id uuid references public.staff(id) on delete set null,
  schedule text not null, monthly_price numeric(14,2) not null default 0, capacity integer not null default 20,
  status text not null default 'نشط', created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null, start_date date not null default current_date,
  end_date date not null, status text not null default 'نشط', amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null, amount numeric(14,2) not null check (amount > 0),
  method text not null default 'نقدي', paid_at timestamptz not null default now(), invoice_number text not null unique default ('INV-' || substr(gen_random_uuid()::text, 1, 8))
);
create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  weight numeric(6,2), notes text, logged_at timestamptz not null default now()
);
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  waist_cm numeric(6,2), hip_cm numeric(6,2), body_fat_percent numeric(5,2), measured_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0), cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(), name text not null, description text, asset_type text not null,
  amount numeric(14,2) not null default 0, status text not null default 'نشط', created_at timestamptz not null default now()
);
create table if not exists public.finance_movements (
  id uuid primary key default gen_random_uuid(), title text not null, account_name text not null,
  category text not null, amount numeric(14,2) not null check (amount > 0),
  direction text not null check (direction in ('in', 'out')), payment_method text not null default 'نقدي',
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(), key text not null unique, value text not null default '',
  description text, created_at timestamptz not null default now()
);

create index if not exists finance_movements_occurred_at_idx on public.finance_movements (occurred_at desc);
create index if not exists members_status_idx on public.members (membership_status);

alter table public.members enable row level security;
alter table public.staff enable row level security;
alter table public.products enable row level security;
alter table public.assets enable row level security;
alter table public.finance_movements enable row level security;
alter table public.app_settings enable row level security;
alter table public.courses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.progress_logs enable row level security;
alter table public.measurements enable row level security;

-- No anonymous access: the website uses its protected server API with a Supabase secret key.
