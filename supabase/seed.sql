-- Nadiak realistic demo data. Run once on a fresh Supabase project after schema.sql.
-- Auth profiles are created through the admin user API because profiles reference auth.users.
insert into public.staff (staff_code, full_name, job_title, specialties, phone, email, compensation_type, monthly_amount, employment_status, hire_date) values
('CO-001','فهد الأبطح','كابتن قوة وتحمل','قوة، تضخيم، لياقة وظيفية','0933000101','fahd@nadik.local','استحقاق شهري',500000,'نشط',current_date - 400),
('CO-002','لينا حمود','كابتن لياقة نسائية','لياقة نسائية، مرونة، تمارين جماعية','0933000102','lina@nadik.local','راتب شهري',400000,'نشط',current_date - 320),
('CO-003','عمر فواز','كابتن تدريب شخصي','تدريب شخصي، إصابات رياضية','0933000103','omar@nadik.local','عمولة شهرية',450000,'نشط',current_date - 250),
('CO-004','نور شحادة','كابتن يوغا وبيلاتس','يوغا، بيلاتس، تأهيل','0933000104','nour@nadik.local','راتب شهري',380000,'نشط',current_date - 180);

insert into public.members (member_code,full_name,phone,whatsapp,gender,join_date,membership_status,plan_name,training_schedule,renewal_date,monthly_fee,goals,assigned_coach_id) values
('MEM-001','سارة محمود','0933001001','0933001001','أنثى',current_date-95,'نشط','لياقة شهرية','الأحد، الثلاثاء، الخميس · 06:00 م',current_date+2,180000,'خسارة وزن وتحسين اللياقة',(select id from public.staff where staff_code='CO-001')),
('MEM-002','أحمد الخطيب','0933001002','0933001002','ذكر',current_date-150,'نشط','رفع أثقال','السبت، الاثنين، الأربعاء · 07:30 م',current_date+15,220000,'زيادة الكتلة العضلية',(select id from public.staff where staff_code='CO-001')),
('MEM-003','مي كمال','0933001003','0933001003','أنثى',current_date-80,'نشط','تدريب شخصي','الأحد والثلاثاء · 09:00 م',current_date+19,450000,'لياقة بعد الولادة',(select id from public.staff where staff_code='CO-003')),
('MEM-004','كريم ناصر','0933001004','0933001004','ذكر',current_date-60,'نشط','كروس فت','السبت، الاثنين، الأربعاء · 06:00 م',current_date+8,250000,'تحمل وقوة',(select id from public.staff where staff_code='CO-001')),
('MEM-005','رنا يوسف','0933001005','0933001005','أنثى',current_date-35,'نشط','لياقة نسائية','الأحد، الثلاثاء، الخميس · 07:00 م',current_date+26,200000,'شد الجسم',(select id from public.staff where staff_code='CO-002')),
('MEM-006','محمد ديب','0933001006','0933001006','ذكر',current_date-120,'نشط','رفع أثقال','السبت، الاثنين، الأربعاء · 07:30 م',current_date+11,220000,'تحسين الأرقام',(select id from public.staff where staff_code='CO-001')),
('MEM-007','تالا حداد','0933001007','0933001007','أنثى',current_date-22,'نشط','يوغا وبيلاتس','الاثنين، الأربعاء · 05:00 م',current_date+5,170000,'مرونة وراحة',(select id from public.staff where staff_code='CO-004')),
('MEM-008','يزن شهاب','0933001008','0933001008','ذكر',current_date-44,'نشط','تدريب شخصي','الأحد والثلاثاء · 09:00 م',current_date+20,450000,'تأهيل الركبة',(select id from public.staff where staff_code='CO-003')),
('MEM-009','هبة سلامة','0933001009','0933001009','أنثى',current_date-75,'نشط','لياقة نسائية','الأحد، الثلاثاء، الخميس · 07:00 م',current_date+13,200000,'لياقة عامة',(select id from public.staff where staff_code='CO-002')),
('MEM-010','سامي عثمان','0933001010','0933001010','ذكر',current_date-15,'بانتظار الدفع','كروس فت','السبت، الاثنين، الأربعاء · 06:00 م',current_date+1,250000,'تحمل',(select id from public.staff where staff_code='CO-001')),
('MEM-011','نادين جابر','0933001011','0933001011','أنثى',current_date-110,'نشط','يوغا وبيلاتس','الاثنين، الأربعاء · 05:00 م',current_date+9,170000,'مرونة',(select id from public.staff where staff_code='CO-004')),
('MEM-012','علي صباغ','0933001012','0933001012','ذكر',current_date-55,'نشط','قوة للمبتدئين','الأحد، الثلاثاء، الخميس · 08:30 م',current_date+22,190000,'بداية آمنة',(select id from public.staff where staff_code='CO-001'));

insert into public.courses (course_code,name,category,short_description,full_description,level,coach_id,schedule,monthly_price,duration_days,sessions_per_week,capacity,status) values
('CR-001','قوة وتحمل','قوة','برنامج لتحسين القوة والتحمل','تمارين مركبة، أحمال تدريجية، وتحمل عضلي ضمن مجموعات صغيرة.','متوسط',(select id from public.staff where staff_code='CO-001'),'السبت، الاثنين، الأربعاء · 06:00 م',250000,30,3,20,'نشط'),
('CR-002','رفع الأثقال','قوة','برنامج رفع أثقال منظم','تقنيات الرفعات الأساسية، متابعة الأرقام وخطة تضخيم.','متوسط',(select id from public.staff where staff_code='CO-001'),'السبت، الاثنين، الأربعاء · 07:30 م',220000,30,3,18,'نشط'),
('CR-003','لياقة نسائية','لياقة','لياقة جماعية للسيدات','تمارين كارديو وقوة ومرونة بإشراف كابتن مختص.','جميع المستويات',(select id from public.staff where staff_code='CO-002'),'الأحد، الثلاثاء، الخميس · 07:00 م',200000,30,3,22,'نشط'),
('CR-004','تدريب شخصي','شخصي','جلسات فردية مخصصة','تقييم كامل وخطة تدريب فردية مع متابعة أسبوعية.','مخصص',(select id from public.staff where staff_code='CO-003'),'الأحد والثلاثاء · 09:00 م',450000,30,2,8,'نشط'),
('CR-005','يوغا وبيلاتس','مرونة','حركة ومرونة وتنفس','جلسات مرونة وتحكم بالجسم مناسبة للمبتدئين.','مبتدئ',(select id from public.staff where staff_code='CO-004'),'الاثنين، الأربعاء · 05:00 م',170000,30,2,16,'نشط'),
('CR-006','قوة للمبتدئين','مبتدئين','مدخل آمن لتدريب القوة','تعلم الحركة الصحيحة وبناء أساس تدريبي آمن.','مبتدئ',(select id from public.staff where staff_code='CO-001'),'الأحد، الثلاثاء، الخميس · 08:30 م',190000,30,3,15,'نشط');

insert into public.course_sessions(course_id,coach_id,day_of_week,start_time,end_time,room)
select c.id,c.coach_id,v.day,v.start_time::time,v.end_time::time,'القاعة الرئيسية' from public.courses c join (values
('CR-001',6,'18:00','19:15'),('CR-001',1,'18:00','19:15'),('CR-001',3,'18:00','19:15'),('CR-002',6,'19:30','20:45'),('CR-002',1,'19:30','20:45'),('CR-002',3,'19:30','20:45'),('CR-003',0,'19:00','20:00'),('CR-003',2,'19:00','20:00'),('CR-003',4,'19:00','20:00'),('CR-004',0,'09:00','10:00'),('CR-004',2,'09:00','10:00'),('CR-005',1,'17:00','18:00'),('CR-005',3,'17:00','18:00'),('CR-006',0,'20:30','21:30'),('CR-006',2,'20:30','21:30'),('CR-006',4,'20:30','21:30')) as v(code,day,start_time,end_time) on c.course_code=v.code;

insert into public.subscriptions(member_id,course_id,start_date,end_date,status,amount)
select m.id,c.id,current_date-20,current_date+10,'نشط',c.monthly_price from public.members m join public.courses c on (m.member_code,c.course_code) in (('MEM-001','CR-001'),('MEM-002','CR-002'),('MEM-003','CR-004'),('MEM-004','CR-001'),('MEM-005','CR-003'),('MEM-006','CR-002'),('MEM-007','CR-005'),('MEM-008','CR-004'),('MEM-009','CR-003'),('MEM-010','CR-001'),('MEM-011','CR-005'),('MEM-012','CR-006'));

insert into public.invoices(member_id,title,total,status,due_date)
select m.id,'اشتراك شهري · '||c.name,c.monthly_price,case when m.membership_status='بانتظار الدفع' then 'issued' else 'paid' end,current_date from public.members m join public.subscriptions s on s.member_id=m.id join public.courses c on c.id=s.course_id;
insert into public.payments(member_id,subscription_id,invoice_id,amount,method,idempotency_key)
select s.member_id,s.id,i.id,s.amount,'نقدي','seed-payment-'||m.member_code from public.subscriptions s join public.members m on m.id=s.member_id join public.invoices i on i.member_id=m.id where m.membership_status='نشط';
insert into public.finance_movements(title,account_name,category,amount,direction,payment_method,source_type,source_id,idempotency_key)
select 'تجديد اشتراك',m.full_name,'اشتراكات',p.amount,'in',p.method,'payment',p.id,'seed-movement-'||m.member_code from public.payments p join public.members m on m.id=p.member_id;
insert into public.attendance(member_id,course_id,attended_at,status)
select s.member_id,s.course_id,now()-(v.day_offset||' days')::interval,case when v.day_offset=4 then 'غائب' else 'حاضر' end from public.subscriptions s cross join (values(1),(2),(4),(6)) as v(day_offset);
insert into public.progress_logs(member_id,weight,notes,logged_at)
select id,case when member_code in ('MEM-001','MEM-005') then 62.5 else 78.5 end,'متابعة أسبوعية جيدة',now()-interval '7 days' from public.members;
insert into public.measurements(member_id,waist_cm,hip_cm,body_fat_percent,measured_at)
select id,case when gender='أنثى' then 76 else 86 end,case when gender='أنثى' then 98 else 102 end,case when gender='أنثى' then 28 else 20 end,now()-interval '7 days' from public.members;
insert into public.member_notes(member_id,coach_id,note,visibility)
select m.id,m.assigned_coach_id,'التزام جيد بالخطة الحالية.','coach' from public.members m where m.member_code in ('MEM-001','MEM-002','MEM-003','MEM-007');
insert into public.coach_payouts(staff_id,amount,method,note)
select id,case staff_code when 'CO-001' then 300000 else 200000 end,'نقدي','دفعة مستحقات شهرية' from public.staff;
insert into public.finance_movements(title,account_name,category,amount,direction,payment_method,source_type,idempotency_key)
select 'سحب مستحقات',full_name,'رواتب الكباتن',case staff_code when 'CO-001' then 300000 else 200000 end,'out','نقدي','coach_payout','seed-payout-'||staff_code from public.staff;
insert into public.products(name,description,stock_quantity,cost_price,sale_price,active) values
('مشروب بروتين','مشروب بروتين فردي',38,60000,85000,true),('قفازات تدريب','قفازات مقاومة للتمرين',17,100000,150000,true),('حزام رفع الأثقال','حزام دعم للظهر',9,240000,350000,true),('ماء رياضي','ماء مع أملاح معدنية',50,12000,20000,true);
insert into public.assets(name,description,asset_type,amount,status) values
('إيجار فرع المزة','إيجار شهري للفرع الرئيسي','إيجار',650000,'قادم'),('جهاز كابل كروس','أصل ثابت للنادي','معدات',4200000,'نشط'),('فاتورة كهرباء','خدمات تشغيلية','مصروف',120000,'معلقة');
insert into public.profit_shares(recipient_name,recipient_role,share_percent,effective_from) values
('المستثمر الرئيسي','investor',50,current_date),('إدارة النادي','admin',25,current_date),('الكباتن والمبيعات','coach',25,current_date);
insert into public.app_settings(key,value,description) values
('club_name','نادي القوة','اسم النادي على الفواتير'),('currency','ليرة سورية','عملة التقارير'),('auto_renewal_reminder_days','7','موعد تنبيه التجديد');
