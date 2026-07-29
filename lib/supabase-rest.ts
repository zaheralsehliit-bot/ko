type SupabaseEnv = { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; SUPABASE_SECRET_KEY?: string };

function config() {
  const runtime = process.env as SupabaseEnv;
  const url = runtime.SUPABASE_URL;
  const key = runtime.SUPABASE_SECRET_KEY ?? runtime.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url: url.replace(/\/$/, ""), key, canWrite: Boolean(runtime.SUPABASE_SECRET_KEY) };
}

export async function supabaseRest(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", headers.get("Authorization") ?? `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers });
}

export function assertWriteAccess() {
  if (!config().canWrite) throw new Error("A Supabase secret key is required for server-side writes.");
}
