# Supabase setup

1. Open **SQL Editor** in the supplied Supabase project.
2. Run `schema.sql` once, then run `seed.sql` once.
3. Add `SUPABASE_SECRET_KEY` as a secret runtime variable for the deployed site. Keep it out of source control and do not expose it in the browser.

The deployed app already receives `SUPABASE_URL` and the publishable key through its runtime environment. The secret key is required only by the protected server API to write records while RLS remains enabled.
