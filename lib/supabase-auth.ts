type RuntimeEnv = { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; SUPABASE_SECRET_KEY?: string };

function runtime() {
  const values = process.env as RuntimeEnv;
  if (!values.SUPABASE_URL || !values.SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase is not configured.");
  return { url: values.SUPABASE_URL.replace(/\/$/, ""), publishable: values.SUPABASE_PUBLISHABLE_KEY, secret: values.SUPABASE_SECRET_KEY };
}

export async function signInWithPassword(email: string, password: string) {
  const { url, publishable } = runtime();
  return fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: publishable, Authorization: `Bearer ${publishable}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
}
export async function currentUser(accessToken: string) {
  const { url, publishable } = runtime();
  return fetch(`${url}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${accessToken}` } });
}
export async function createAuthUser(email: string, password: string, fullName: string) {
  const { url, secret } = runtime(); if (!secret) throw new Error("SUPABASE_SECRET_KEY is required to create users.");
  return fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }) });
}
export async function deleteAuthUser(userId: string) {
  const { url, secret } = runtime(); if (!secret) throw new Error("SUPABASE_SECRET_KEY is required to delete users.");
  return fetch(`${url}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: { apikey: secret, Authorization: `Bearer ${secret}` } });
}
export function authCookie(token: string) { return `nadiak_access_token=${token}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`; }
