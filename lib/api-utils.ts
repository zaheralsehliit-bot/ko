import { supabaseRest } from "./supabase-rest";

export function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function text(value: unknown, max = 180) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""; }
export function amount(value: unknown, allowZero = false) { const number = Number(value); return Number.isSafeInteger(number) && (allowZero ? number >= 0 : number > 0) ? number : null; }
export async function readOne<T>(path: string) { const response = await supabaseRest(path); if (!response.ok) throw new Error("read failed"); const rows = await response.json() as T[]; return rows[0] ?? null; }
export async function audit(actorId: string | undefined, action: string, entityType: string, entityId: string | undefined, metadata: Record<string, unknown> = {}) {
  await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, metadata }) }).catch(() => undefined);
}
