/**
 * KO now persists data in Supabase. This compatibility module deliberately
 * has no Cloudflare/D1 runtime dependency so standard Node hosts can build.
 */
export function getDb(): never {
  throw new Error("قاعدة بيانات KO تستخدم Supabase؛ لا يتوفر اتصال D1 في هذه الاستضافة.");
}

export async function ensureFinanceSchema(): Promise<void> {
  // The Supabase migration manages finance_movements atomically.
}
