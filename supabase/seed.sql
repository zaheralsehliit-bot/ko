insert into public.members (full_name, phone, plan_name, training_schedule, membership_status, renewal_date, monthly_fee) values
  ('سارة محمود', '0933000001', 'باقة اللياقة', '3 حصص أسبوعيًا · 06:00 م', 'تنتهي بعد يومين', current_date + 2, 180000),
  ('أحمد الخطيب', '0933000002', 'رفع الأثقال', '4 حصص أسبوعيًا · 07:30 م', 'نشط', current_date + 18, 220000),
  ('مي كمال', '0933000003', 'تدريب شخصي', '8 جلسات شهريًا · 09:00 م', 'نشط', current_date + 24, 450000);
insert into public.staff (full_name, job_title, compensation_type, monthly_amount, employment_status) values
  ('فهد الأبطح', 'كابتن قوة وتحمل', 'نسبة شهرية', 500000, 'نشط'),
  ('لينا حمود', 'كابتن لياقة نسائية', 'راتب شهري', 400000, 'نشط'),
  ('ريم محمد', 'موظفة استقبال', 'راتب شهري', 350000, 'نشط');
insert into public.products (name, description, stock_quantity, cost_price, sale_price) values
  ('مشروب بروتين', 'مشروب بروتين فردي', 38, 6000, 8500),
  ('قفازات تدريب', 'قفازات مقاومة للتدريب', 17, 10000, 15000),
  ('حزام رفع الأثقال', 'حزام دعم للظهر', 9, 24000, 35000);
insert into public.assets (name, description, asset_type, amount, status) values
  ('إيجار فرع المزة', 'إيجار شهري للفرع الرئيسي', 'إيجار', 650000, 'قادم'),
  ('جهاز كابل كروس', 'أصل ثابت للنادي', 'معدات', 4200000, 'نشط'),
  ('فاتورة كهرباء يوليو', 'خدمات تشغيلية', 'مصروف', 120000, 'معلقة');
insert into public.finance_movements (title, account_name, category, amount, direction, payment_method) values
  ('تجديد اشتراك', 'سارة محمود', 'اشتراكات', 180000, 'in', 'تحويل'),
  ('سحب مستحقات', 'الكابتن فهد الأبطح', 'رواتب الكباتن', 300000, 'out', 'نقدي'),
  ('بيع منتج', 'مشروب بروتين', 'مبيعات المتجر', 85000, 'in', 'نقدي'),
  ('دفعة إيجار', 'فرع المزة', 'إيجارات', 650000, 'out', 'تحويل بنكي');
insert into public.app_settings (key, value, description) values
  ('club_name', 'نادي القوة', 'اسم النادي على الفواتير'),
  ('currency', 'ليرة سورية', 'عملة التقارير'),
  ('investor_share', '50', 'نسبة المستثمر من صافي الربح');
