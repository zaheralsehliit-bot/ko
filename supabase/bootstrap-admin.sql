-- 1) In Supabase Dashboard > Authentication > Users, create and confirm the first admin user.
-- 2) Copy that user's UUID and replace ADMIN_USER_UUID below, then run this statement.
insert into public.profiles (id, full_name, role, active)
values ('ADMIN_USER_UUID', 'زاهر السهلي', 'admin', true)
on conflict (id) do update set full_name = excluded.full_name, role = 'admin', active = true;
