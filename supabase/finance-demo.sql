-- Development/demo-only finance data. Run this only after finance-center.sql:
--   set app.ko_demo_seed = 'true';
--   \i supabase/finance-demo.sql
do $$ begin
  if current_setting('app.ko_demo_seed', true) is distinct from 'true' then
    raise exception 'KO demo seed is disabled. Set app.ko_demo_seed=true only in a development/demo database.';
  end if;
end $$;

insert into public.staff(full_name,job_title,compensation_type,monthly_amount,employment_status)
select x.name,'KO coach','per-course commission',0,'active' from (values('Coach Fahd'),('Coach Maram'),('Coach Layth')) x(name)
where not exists(select 1 from public.staff s where s.full_name=x.name);
insert into public.members(full_name,phone,plan_name,training_schedule,membership_status,monthly_fee)
select x.name,'0933000000','KO training plan','3 sessions weekly','active',150000 from (values('Rami Hassan'),('Lina Ahmad'),('Omar Khaled'),('Sama Ali'),('Nour Saleh'),('Yazan Noor')) x(name)
where not exists(select 1 from public.members m where m.full_name=x.name);
insert into public.courses(name,coach_id,schedule,monthly_price,capacity,status)
select x.course,(select id from public.staff where full_name=x.coach limit 1),'Sun Tue Thu',150000,20,'active' from (values('Fahd Boxing','Coach Fahd'),('Maram Fitness','Coach Maram'),('Layth Kickboxing','Coach Layth')) x(course,coach)
where not exists(select 1 from public.courses c where c.name=x.course);

do $$
declare course_ids uuid[]; member_ids uuid[]; c uuid; m uuid; subscription_id uuid; invoice_id uuid; d integer;
begin
  select array_agg(id order by name) into course_ids from public.courses where name in ('Fahd Boxing','Maram Fitness','Layth Kickboxing');
  select array_agg(id order by full_name) into member_ids from public.members where full_name in ('Rami Hassan','Lina Ahmad','Omar Khaled','Sama Ali','Nour Saleh','Yazan Noor');
  if coalesce(array_length(course_ids,1),0)<3 or coalesce(array_length(member_ids,1),0)<6 then raise exception 'Demo entities were not created'; end if;
  for d in 1..90 loop
    c:=course_ids[1+(d%3)]; m:=member_ids[1+(d%6)];
    insert into public.subscriptions(member_id,course_id,start_date,end_date,status,amount) values(m,c,current_date-d,current_date-d+30,'active',150000) returning id into subscription_id;
    insert into public.invoices(member_id,subscription_id,course_id,title,total,status,due_date,issued_at) values(m,subscription_id,c,'KO course invoice',150000,case when d%11=0 then 'issued' else 'paid' end,current_date-d+7,now()-(d||' days')::interval) returning id into invoice_id;
    if d%11<>0 then insert into public.payments(member_id,subscription_id,invoice_id,amount,method,idempotency_key,paid_at) values(m,subscription_id,invoice_id,150000,case when d%2=0 then 'cash' else 'bank transfer' end,'demo-payment-'||d,now()-(d||' days')::interval); end if;
  end loop;
  update public.payments set refunded_amount=25000 where id=(select id from public.payments where idempotency_key='demo-payment-14');
end $$;

insert into public.financial_vouchers(voucher_type,direction,status,amount,title,category,source_account_id,occurred_at,idempotency_key)
select 'expense','expense','paid',x.amount,x.title,x.category,(select id from public.finance_accounts where code='CASH-MAIN'),now()-(x.day||' days')::interval,'demo-expense-'||x.day
from (values(85000::numeric,'Gym rent','operating_expense',4),(45000::numeric,'Equipment repair','operating_expense',12),(25000::numeric,'Internet service','operating_expense',28),(60000::numeric,'Marketing campaign','operating_expense',53)) x(amount,title,category,day)
on conflict (idempotency_key) do nothing;
insert into public.financial_vouchers(voucher_type,direction,status,amount,title,category,partner_id,occurred_at,idempotency_key)
select 'expense','expense','paid',40000,'Partner-paid club supply','operating_expense',p.id,now()-interval '21 days','demo-partner-expense'
from public.finance_partners p where p.name='Dr Abdul Hakim' on conflict (idempotency_key) do nothing;
insert into public.partner_ledger_entries(partner_id,entry_type,direction,amount,reason)
select id,'club_payable','credit_to_partner',40000,'Club supply paid personally' from public.finance_partners where name='Dr Abdul Hakim'
and not exists(select 1 from public.partner_ledger_entries where reason='Club supply paid personally');
insert into public.finance_cash_closings(account_id,closing_date,opening_cash,expected_cash,actual_cash,difference,status)
select id,current_date-1,400000,760000,760000,0,'approved' from public.finance_accounts where code='CASH-MAIN'
on conflict(account_id,closing_date) do nothing;
