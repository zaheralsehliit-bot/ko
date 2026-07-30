import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("booking endpoint requires an authenticated customer or administrator", async () => {
  const route = await source("app/api/booking/route.ts");
  assert.match(route, /requireRole\(request, \["admin", "customer"\]\)/);
  assert.match(route, /auth\.session\?\.role === "customer" \? auth\.session\.memberId/);
  assert.match(route, /rpc\/book_coach_slot/);
  assert.match(route, /partySize < 1 \|\| partySize > 10/);
});

test("database booking function locks capacity and prevents duplicate or overlapping slots", async () => {
  const schema = await source("supabase/schema.sql");
  assert.match(schema, /exclude using gist \(coach_id with =, tstzrange\(starts_at, ends_at, '\[\)'\) with &&\)/);
  assert.match(schema, /where id = p_availability_id for update/);
  assert.match(schema, /Member already has a booking for this slot/);
  assert.match(schema, /v_reserved \+ p_party_size > v_slot\.capacity/);
  assert.match(schema, /grant execute on function public\.book_coach_slot[\s\S]*to service_role/);
});

test("today agenda stays server-authorized and uses the configured club timezone", async () => {
  const route = await source("app/api/dashboard/today/route.ts");
  const schema = await source("supabase/schema.sql");
  assert.match(route, /requireRole\(request, \["admin", "coach"\]\)/);
  assert.match(route, /auth\.session\?\.role === "coach" \? auth\.session\.staffId/);
  assert.match(route, /club_timezone/);
  assert.match(route, /rpc\/today_online_agenda/);
  assert.match(schema, /create or replace function public\.today_online_agenda\(p_timezone text default 'Asia\/Damascus'/);
});

test("hosted Cal.com integration does not trust unsigned bookings", async () => {
  const webhook = await source("app/api/webhooks/cal/route.ts");
  const page = await source("app/online-lessons/CalHostedBooker.tsx");
  const schema = await source("supabase/schema.sql");
  assert.match(page, /NEXT_PUBLIC_CAL_BOOKING_URL/);
  assert.match(webhook, /x-cal-signature-256/);
  assert.match(webhook, /createHmac\("sha256", secret\)/);
  assert.match(webhook, /on_conflict=cal_uid/);
  assert.match(schema, /create table if not exists public\.cal_booking_sync/);
  assert.match(schema, /cal_uid text not null unique/);
});
