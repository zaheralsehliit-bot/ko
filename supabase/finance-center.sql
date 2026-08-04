-- KO Fighters Finance Center migration
-- Run after supabase/schema.sql. This migration is additive and rerunnable.
-- It never deletes or rewrites historical payment, invoice, or movement rows.

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('cashbox','bank','partner_clearing','receivable','payable')),
  currency text not null default 'SYP',
  opening_balance numeric(14,2) not null default 0,
  allow_negative boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_number text unique,
  voucher_type text not null check (voucher_type in ('income','expense','payment','transfer','distribution','refund','adjustment')),
  direction text not null check (direction in ('income','expense','transfer')),
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','partially_paid','paid','void')),
  occurred_at timestamptz not null default now(), currency text not null default 'SYP',
  amount numeric(14,2) not null check (amount > 0),
  source_account_id uuid references public.finance_accounts(id) on delete restrict,
  destination_account_id uuid references public.finance_accounts(id) on delete restrict,
  payment_method text, category text not null default 'other', title text not null, reason text, notes text,
  member_id uuid references public.members(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  coach_id uuid references public.staff(id) on delete set null,
  partner_id uuid, invoice_id uuid references public.invoices(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  related_voucher_id uuid references public.financial_vouchers(id) on delete restrict,
  idempotency_key text unique, created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz,
  paid_by uuid references public.profiles(id) on delete set null, paid_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null, voided_at timestamptz, void_reason text,
  created_at timestamptz not null default now(),
  check ((direction <> 'transfer') or (source_account_id is not null and destination_account_id is not null and source_account_id <> destination_account_id))
);

create table if not exists public.financial_transaction_lines (
  id uuid primary key default gen_random_uuid(), voucher_id uuid not null references public.financial_vouchers(id) on delete restrict,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  line_type text not null check (line_type in ('debit','credit')),
  amount numeric(14,2) not null check (amount > 0), memo text, created_at timestamptz not null default now()
);

create table if not exists public.finance_partners (
  id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  name text not null unique, partner_type text not null check (partner_type in ('investor','management','partner')),
  active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.financial_vouchers add column if not exists partner_id uuid references public.finance_partners(id) on delete set null;
do $$ begin
  alter table public.financial_vouchers add constraint financial_vouchers_partner_fk foreign key (partner_id) references public.finance_partners(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.course_commission_rules (
  id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id) on delete cascade,
  coach_id uuid not null references public.staff(id) on delete restrict,
  percentage numeric(5,2) not null default 50 check (percentage between 0 and 100),
  effective_from date not null default current_date, effective_to date, active boolean not null default true,
  applies_to_partner_coach boolean not null default true, created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz, created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.coach_commission_entries (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null unique references public.payments(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  coach_id uuid not null references public.staff(id) on delete restrict,
  voucher_id uuid references public.financial_vouchers(id) on delete set null,
  rule_id uuid references public.course_commission_rules(id) on delete set null,
  percentage_snapshot numeric(5,2) not null check (percentage_snapshot between 0 and 100),
  paid_revenue numeric(14,2) not null check (paid_revenue >= 0), refunded_revenue numeric(14,2) not null default 0 check (refunded_revenue >= 0),
  accrued_amount numeric(14,2) not null check (accrued_amount >= 0), paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  reversed_amount numeric(14,2) not null default 0 check (reversed_amount >= 0), status text not null default 'accrued' check (status in ('accrued','partially_paid','paid','reversed')),
  created_at timestamptz not null default now(), check (paid_amount + reversed_amount <= accrued_amount)
);

create table if not exists public.coach_payout_allocations (
  id uuid primary key default gen_random_uuid(), payout_id uuid not null references public.coach_payouts(id) on delete restrict,
  commission_entry_id uuid not null references public.coach_commission_entries(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0), unique(payout_id, commission_entry_id)
);

create table if not exists public.partner_profit_rules (
  id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.finance_partners(id) on delete restrict,
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  effective_from date not null default current_date, effective_to date, active boolean not null default true,
  partner_coach_mode text not null default 'both' check (partner_coach_mode in ('commission_only','profit_share_only','both')),
  locked_at timestamptz, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.partner_ledger_entries (
  id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.finance_partners(id) on delete restrict,
  voucher_id uuid references public.financial_vouchers(id) on delete set null,
  entry_type text not null check (entry_type in ('capital','club_payable','partner_receivable','profit_distribution','distribution_paid','deduction','settlement','reimbursement')),
  direction text not null check (direction in ('credit_to_partner','debit_to_partner')),
  amount numeric(14,2) not null check (amount > 0), occurred_at timestamptz not null default now(),
  reason text not null, created_at timestamptz not null default now()
);

create table if not exists public.expense_responsibility_allocations (
  id uuid primary key default gen_random_uuid(), voucher_id uuid not null references public.financial_vouchers(id) on delete restrict,
  partner_id uuid not null references public.finance_partners(id) on delete restrict,
  allocation_percent numeric(5,2), allocation_amount numeric(14,2), settlement_method text not null default 'deduct_distribution' check (settlement_method in ('club_payable','deduct_distribution','partner_receivable')),
  created_at timestamptz not null default now(),
  check ((allocation_percent is not null and allocation_percent > 0 and allocation_percent <= 100) or (allocation_amount is not null and allocation_amount > 0))
);

create table if not exists public.finance_cash_closings (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.finance_accounts(id) on delete restrict,
  closing_date date not null, opening_cash numeric(14,2) not null default 0, expected_cash numeric(14,2) not null default 0,
  actual_cash numeric(14,2), difference numeric(14,2), explanation text, attachment_url text,
  status text not null default 'open' check (status in ('open','submitted','approved','discrepancy')),
  created_by uuid references public.profiles(id) on delete set null, approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz, created_at timestamptz not null default now(), unique(account_id, closing_date)
);

create table if not exists public.finance_attachments (
  id uuid primary key default gen_random_uuid(), voucher_id uuid not null references public.financial_vouchers(id) on delete cascade,
  url text not null, file_name text not null, mime_type text, uploaded_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.finance_audit_logs (
  id bigint generated always as identity primary key, voucher_id uuid references public.financial_vouchers(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null, action text not null, before_data jsonb, after_data jsonb,
  created_at timestamptz not null default now()
);

-- Existing documents keep their identity, while course ownership becomes explicit.
alter table public.payments add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.payments add column if not exists coach_id uuid references public.staff(id) on delete set null;
alter table public.payments add column if not exists discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0);
alter table public.payments add column if not exists refunded_amount numeric(14,2) not null default 0 check (refunded_amount >= 0);
alter table public.payments add column if not exists currency text not null default 'SYP';
alter table public.invoices add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;
alter table public.invoices add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.invoices add column if not exists discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0);
alter table public.invoices add column if not exists refunded_amount numeric(14,2) not null default 0 check (refunded_amount >= 0);

-- Keep the legacy renewal workflow atomic while preserving the course and
-- subscription relationship required by the Finance Center.
create or replace function public.renew_membership(p_member_id uuid, p_course_id uuid, p_end_date date, p_amount numeric, p_paid boolean, p_method text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare subscription_id uuid; invoice_id uuid; payment_id uuid; movement_id uuid;
begin
  if p_amount <= 0 or p_end_date < current_date then raise exception 'Invalid renewal values'; end if;
  if p_idempotency_key is not null and exists(select 1 from public.payments where idempotency_key = p_idempotency_key) then
    select subscription_id, invoice_id, id into subscription_id, invoice_id, payment_id from public.payments where idempotency_key = p_idempotency_key;
    return jsonb_build_object('subscription_id',subscription_id,'invoice_id',invoice_id,'payment_id',payment_id,'idempotent',true);
  end if;
  insert into public.subscriptions(member_id,course_id,start_date,end_date,status,amount)
    values(p_member_id,p_course_id,current_date,p_end_date,case when p_paid then 'نشط' else 'بانتظار الدفع' end,p_amount) returning id into subscription_id;
  insert into public.invoices(member_id,subscription_id,course_id,title,total,status,due_date)
    values(p_member_id,subscription_id,p_course_id,'Membership renewal',p_amount,case when p_paid then 'paid' else 'issued' end,current_date) returning id into invoice_id;
  if p_paid then
    insert into public.payments(member_id,subscription_id,invoice_id,amount,method,idempotency_key)
      values(p_member_id,subscription_id,invoice_id,p_amount,coalesce(p_method,'cash'),p_idempotency_key) returning id into payment_id;
    insert into public.finance_movements(title,account_name,category,amount,direction,payment_method,source_type,source_id,idempotency_key)
      values('Membership renewal','Member subscriptions','subscriptions',p_amount,'in',coalesce(p_method,'cash'),'payment',payment_id,p_idempotency_key) returning id into movement_id;
  end if;
  update public.members set renewal_date=p_end_date,membership_status=case when p_paid then 'نشط' else 'بانتظار الدفع' end where id=p_member_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(null,'renew_membership','members',p_member_id,jsonb_build_object('subscription_id',subscription_id,'invoice_id',invoice_id,'payment_id',payment_id,'movement_id',movement_id));
  return jsonb_build_object('subscription_id',subscription_id,'invoice_id',invoice_id,'payment_id',payment_id,'movement_id',movement_id,'idempotent',false);
end $$;

create index if not exists financial_vouchers_occurred_idx on public.financial_vouchers(occurred_at desc, status);
create index if not exists financial_vouchers_course_idx on public.financial_vouchers(course_id, occurred_at desc);
create index if not exists commission_entries_coach_idx on public.coach_commission_entries(coach_id, status);
create index if not exists partner_ledger_partner_idx on public.partner_ledger_entries(partner_id, occurred_at desc);
create index if not exists payments_course_idx on public.payments(course_id, paid_at desc);

create or replace function public.finance_voucher_number() returns trigger language plpgsql security definer set search_path = public as $$
declare prefix text; serial_no integer;
begin
  if new.voucher_number is not null then return new; end if;
  prefix := case new.voucher_type when 'income' then 'INC' when 'expense' then 'EXP' when 'payment' then 'PAY' when 'transfer' then 'TRF' when 'distribution' then 'DST' when 'refund' then 'PAY' else 'PAY' end;
  select count(*) + 1 into serial_no from public.financial_vouchers where date_trunc('month',occurred_at) = date_trunc('month',new.occurred_at) and voucher_type = new.voucher_type;
  new.voucher_number := prefix || '-' || to_char(new.occurred_at,'YYYYMM') || '-' || lpad(serial_no::text,4,'0');
  return new;
end $$;
drop trigger if exists finance_voucher_number_trigger on public.financial_vouchers;
create trigger finance_voucher_number_trigger before insert on public.financial_vouchers for each row execute function public.finance_voucher_number();

create or replace function public.finance_post_voucher_lines() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'income' and new.destination_account_id is not null then
    insert into public.financial_transaction_lines(voucher_id,account_id,line_type,amount,memo) values(new.id,new.destination_account_id,'debit',new.amount,new.title);
  elsif new.direction = 'expense' and new.source_account_id is not null then
    insert into public.financial_transaction_lines(voucher_id,account_id,line_type,amount,memo) values(new.id,new.source_account_id,'credit',new.amount,new.title);
  elsif new.direction = 'transfer' then
    insert into public.financial_transaction_lines(voucher_id,account_id,line_type,amount,memo) values(new.id,new.source_account_id,'credit',new.amount,new.title),(new.id,new.destination_account_id,'debit',new.amount,new.title);
  end if;
  return new;
end $$;
drop trigger if exists finance_post_voucher_lines_trigger on public.financial_vouchers;
create trigger finance_post_voucher_lines_trigger after insert on public.financial_vouchers for each row execute function public.finance_post_voucher_lines();

create or replace function public.finance_fill_payment_ownership() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.subscription_id is not null and (new.course_id is null or new.coach_id is null) then
    select s.course_id, c.coach_id into new.course_id, new.coach_id from public.subscriptions s left join public.courses c on c.id=s.course_id where s.id=new.subscription_id;
  end if;
  return new;
end $$;
drop trigger if exists finance_fill_payment_ownership_trigger on public.payments;
create trigger finance_fill_payment_ownership_trigger before insert or update of subscription_id on public.payments for each row execute function public.finance_fill_payment_ownership();

create or replace function public.finance_post_course_payment() returns trigger language plpgsql security definer set search_path = public as $$
declare rule_row public.course_commission_rules%rowtype; pct numeric(5,2) := 50; voucher uuid; net_paid numeric(14,2); accrued numeric(14,2); cash_account uuid;
begin
  if new.course_id is null or new.coach_id is null then return new; end if;
  select id into cash_account from public.finance_accounts where code='CASH-MAIN' and active limit 1;
  net_paid := greatest(new.amount - coalesce(new.refunded_amount,0),0);
  select * into rule_row from public.course_commission_rules
    where active and coach_id=new.coach_id and (course_id is null or course_id=new.course_id)
      and effective_from <= new.paid_at::date and (effective_to is null or effective_to >= new.paid_at::date)
    order by case when course_id=new.course_id then 0 else 1 end, effective_from desc limit 1;
  pct := coalesce(rule_row.percentage,50); accrued := round(net_paid * pct / 100,2);
  insert into public.financial_vouchers(voucher_type,direction,status,amount,title,category,payment_method,destination_account_id,member_id,course_id,coach_id,invoice_id,subscription_id,payment_id,idempotency_key,occurred_at)
    values('income','income','paid',new.amount,'Course payment','course_payment',new.method,cash_account,new.member_id,new.course_id,new.coach_id,new.invoice_id,new.subscription_id,new.id,'payment-voucher-'||new.id,new.paid_at)
    on conflict (idempotency_key) do update set amount=excluded.amount returning id into voucher;
  insert into public.coach_commission_entries(payment_id,course_id,coach_id,voucher_id,rule_id,percentage_snapshot,paid_revenue,refunded_revenue,accrued_amount,status)
    values(new.id,new.course_id,new.coach_id,voucher,rule_row.id,pct,net_paid,new.refunded_amount,accrued,case when accrued=0 then 'reversed' else 'accrued' end)
    on conflict (payment_id) do nothing;
  return new;
end $$;
drop trigger if exists finance_post_course_payment_trigger on public.payments;
create trigger finance_post_course_payment_trigger after insert on public.payments for each row execute function public.finance_post_course_payment();

create or replace function public.finance_sync_payment_refund() returns trigger language plpgsql security definer set search_path = public as $$
declare pct numeric(5,2);
begin
  if new.course_id is null or new.coach_id is null then return new; end if;
  select percentage_snapshot into pct from public.coach_commission_entries where payment_id=new.id;
  if pct is null then return new; end if;
  update public.coach_commission_entries set refunded_revenue=new.refunded_amount, accrued_amount=round(greatest(new.amount-new.refunded_amount,0)*pct/100,2), reversed_amount=round(new.refunded_amount*pct/100,2), status=case when new.refunded_amount>=new.amount then 'reversed' when paid_amount>0 then 'partially_paid' else 'accrued' end where payment_id=new.id;
  return new;
end $$;
drop trigger if exists finance_sync_payment_refund_trigger on public.payments;
create trigger finance_sync_payment_refund_trigger after update of refunded_amount on public.payments for each row execute function public.finance_sync_payment_refund();

create or replace function public.finance_partner_distribution_preview(p_start date, p_end date) returns jsonb language sql stable security definer set search_path = public as $$
  with totals as (
    select coalesce(sum(case when direction='income' and voucher_type <> 'refund' then amount else 0 end),0) gross_income,
           coalesce(sum(case when voucher_type='refund' then amount else 0 end),0) refunds,
           coalesce(sum(case when direction='expense' and category not in ('coach_commission','partner_distribution') then amount else 0 end),0) operating_expenses
    from public.financial_vouchers where status in ('approved','partially_paid','paid') and occurred_at::date between p_start and p_end
  ), commissions as (select coalesce(sum(accrued_amount-reversed_amount),0) amount from public.coach_commission_entries where created_at::date between p_start and p_end),
  rules as (select r.partner_id,r.percentage,p.name from public.partner_profit_rules r join public.finance_partners p on p.id=r.partner_id where r.active and r.effective_from<=p_end and (r.effective_to is null or r.effective_to>=p_start))
  select jsonb_build_object('gross_income',t.gross_income,'refunds',t.refunds,'coach_commissions',c.amount,'operating_expenses',t.operating_expenses,'distributable_net_profit',greatest(t.gross_income-t.refunds-c.amount-t.operating_expenses,0),'partners',coalesce((select jsonb_agg(jsonb_build_object('partner_id',partner_id,'name',name,'percentage',percentage,'entitlement',round(greatest(t.gross_income-t.refunds-c.amount-t.operating_expenses,0)*percentage/100,2))) from rules),'[]'::jsonb)) from totals t cross join commissions c
$$;

create or replace function public.finance_void_voucher(p_voucher_id uuid, p_reason text, p_actor_id uuid default null) returns uuid language plpgsql security definer set search_path = public as $$
declare original public.financial_vouchers%rowtype; reversal_id uuid;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then raise exception 'Admin only'; end if;
  select * into original from public.financial_vouchers where id=p_voucher_id for update;
  if not found or original.status='void' then raise exception 'Voucher cannot be voided'; end if;
  insert into public.financial_vouchers(voucher_type,direction,status,amount,title,category,reason,related_voucher_id,source_account_id,destination_account_id,member_id,course_id,coach_id,partner_id,invoice_id,subscription_id,payment_id)
    values('adjustment',case when original.direction='income' then 'expense' when original.direction='expense' then 'income' else 'transfer' end,'approved',original.amount,'Reversal '||original.voucher_number,original.category,p_reason,original.id,
      case when original.direction='income' then original.destination_account_id when original.direction='transfer' then original.destination_account_id end,
      case when original.direction='expense' then original.source_account_id when original.direction='transfer' then original.source_account_id end,
      original.member_id,original.course_id,original.coach_id,original.partner_id,original.invoice_id,original.subscription_id,original.payment_id) returning id into reversal_id;
  update public.financial_vouchers set status='void',voided_at=now(),void_reason=p_reason where id=p_voucher_id;
  insert into public.finance_audit_logs(voucher_id,actor_id,action,after_data) values(p_voucher_id,coalesce(p_actor_id,auth.uid()),'void',jsonb_build_object('reversal_voucher_id',reversal_id,'reason',p_reason));
  return reversal_id;
end $$;

create or replace view public.finance_account_balances as
select a.id,a.code,a.name,a.kind,a.currency,a.opening_balance + coalesce(sum(case when v.id is null then 0 when l.line_type='debit' then l.amount else -l.amount end),0) balance
from public.finance_accounts a left join public.financial_transaction_lines l on l.account_id=a.id left join public.financial_vouchers v on v.id=l.voucher_id and v.status in ('approved','partially_paid','paid') group by a.id;

-- Default accounts and the agreed partner structure. Existing rows are untouched.
insert into public.finance_accounts(code,name,kind) values ('CASH-MAIN','Main cashbox','cashbox'),('BANK-MAIN','Main bank account','bank'),('CLR-PARTNER','Partner clearing','partner_clearing') on conflict (code) do nothing;
insert into public.finance_partners(name,partner_type) values ('Dr Abdul Hakim','investor'),('Zaher','management'),('Coach Fahd','partner') on conflict (name) do nothing;
insert into public.partner_profit_rules(partner_id,percentage,effective_from,partner_coach_mode)
select id,case name when 'Dr Abdul Hakim' then 45 when 'Zaher' then 10 else 45 end,current_date,case when name='Coach Fahd' then 'both' else 'profit_share_only' end from public.finance_partners
where not exists (select 1 from public.partner_profit_rules r where r.partner_id=finance_partners.id and r.active);

alter table public.finance_accounts enable row level security; alter table public.financial_vouchers enable row level security; alter table public.financial_transaction_lines enable row level security;
alter table public.finance_partners enable row level security; alter table public.course_commission_rules enable row level security; alter table public.coach_commission_entries enable row level security;
alter table public.coach_payout_allocations enable row level security; alter table public.partner_profit_rules enable row level security; alter table public.partner_ledger_entries enable row level security;
alter table public.expense_responsibility_allocations enable row level security; alter table public.finance_cash_closings enable row level security; alter table public.finance_attachments enable row level security; alter table public.finance_audit_logs enable row level security;
do $$ declare t text; begin foreach t in array array['finance_accounts','financial_vouchers','financial_transaction_lines','finance_partners','course_commission_rules','coach_commission_entries','coach_payout_allocations','partner_profit_rules','partner_ledger_entries','expense_responsibility_allocations','finance_cash_closings','finance_attachments','finance_audit_logs'] loop execute format('drop policy if exists finance_admin_all on public.%I',t); execute format('create policy finance_admin_all on public.%I for all using (public.is_admin()) with check (public.is_admin())',t); end loop; end $$;
drop policy if exists finance_investor_vouchers on public.financial_vouchers; create policy finance_investor_vouchers on public.financial_vouchers for select using (public.is_investor() and (partner_id in (select id from public.finance_partners where profile_id=auth.uid()) or status in ('approved','paid')));
drop policy if exists finance_coach_commissions on public.coach_commission_entries; create policy finance_coach_commissions on public.coach_commission_entries for select using (coach_id=(select staff_id from public.profiles where id=auth.uid()));
drop policy if exists finance_coach_rules on public.course_commission_rules; create policy finance_coach_rules on public.course_commission_rules for select using (coach_id=(select staff_id from public.profiles where id=auth.uid()));

grant select on public.finance_account_balances to authenticated, service_role;
grant execute on function public.finance_partner_distribution_preview(date,date) to authenticated, service_role;
grant execute on function public.finance_void_voucher(uuid,text,uuid) to authenticated, service_role;

-- A payout is allocated oldest-first against immutable commission snapshots. It is
-- intentionally an RPC so the voucher, payout, allocations, and balances succeed or fail together.
alter table public.coach_payouts add column if not exists voucher_id uuid references public.financial_vouchers(id) on delete set null;

create or replace function public.finance_create_coach_payout(
  p_coach_id uuid, p_amount numeric, p_source_account_id uuid, p_method text default 'cash', p_note text default null, p_idempotency_key text default null, p_actor_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare payout_id uuid; voucher_id uuid; remaining numeric(14,2) := p_amount; entry record; allocation numeric(14,2);
begin
  if auth.role() <> 'service_role' and not public.is_admin() then raise exception 'Admin only'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_source_account_id is null then raise exception 'A source account is required'; end if;
  if exists(select 1 from public.finance_accounts where id=p_source_account_id and not allow_negative and (select balance from public.finance_account_balances where id=p_source_account_id) < p_amount) then raise exception 'Insufficient account balance'; end if;

  insert into public.financial_vouchers(voucher_type,direction,status,amount,title,category,payment_method,source_account_id,coach_id,idempotency_key,notes,paid_by,paid_at)
    values('payment','expense','paid',p_amount,'Coach commission payout','coach_commission',p_method,p_source_account_id,p_coach_id,coalesce(p_idempotency_key,'coach-payout-'||gen_random_uuid()),p_note,coalesce(p_actor_id,auth.uid()),now())
    returning id into voucher_id;
  insert into public.coach_payouts(staff_id,amount,method,paid_at,note,voucher_id) values(p_coach_id,p_amount,p_method,now(),p_note,voucher_id) returning id into payout_id;

  for entry in select id, accrued_amount, paid_amount, reversed_amount from public.coach_commission_entries
    where coach_id=p_coach_id and accrued_amount > paid_amount + reversed_amount and status in ('accrued','partially_paid') order by created_at, id for update
  loop
    exit when remaining <= 0;
    allocation := least(remaining, entry.accrued_amount-entry.paid_amount-entry.reversed_amount);
    insert into public.coach_payout_allocations(payout_id,commission_entry_id,amount) values(payout_id,entry.id,allocation);
    update public.coach_commission_entries set paid_amount=paid_amount+allocation, status=case when paid_amount+allocation+reversed_amount >= accrued_amount then 'paid' else 'partially_paid' end where id=entry.id;
    remaining := remaining-allocation;
  end loop;
  if remaining > 0 then raise exception 'Payout exceeds the coach payable balance'; end if;
  insert into public.finance_audit_logs(voucher_id,actor_id,action,after_data) values(voucher_id,coalesce(p_actor_id,auth.uid()),'coach_payout',jsonb_build_object('payout_id',payout_id,'coach_id',p_coach_id,'amount',p_amount));
  return payout_id;
end $$;

create or replace function public.finance_audit_voucher_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' then insert into public.finance_audit_logs(voucher_id,actor_id,action,after_data) values(new.id,coalesce(new.created_by,auth.uid()),'created',to_jsonb(new)); return new; end if;
  insert into public.finance_audit_logs(voucher_id,actor_id,action,before_data,after_data) values(new.id,auth.uid(),'updated',to_jsonb(old),to_jsonb(new));
  return new;
end $$;
drop trigger if exists finance_audit_voucher_change_trigger on public.financial_vouchers;
create trigger finance_audit_voucher_change_trigger after insert or update on public.financial_vouchers for each row execute function public.finance_audit_voucher_change();

grant execute on function public.finance_create_coach_payout(uuid,numeric,uuid,text,text,text,uuid) to authenticated, service_role;
