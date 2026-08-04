import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/finance-center.sql", import.meta.url), "utf8");
const seed = await readFile(new URL("../supabase/finance-demo.sql", import.meta.url), "utf8");

test("finance migration records a 50 percent historical coach commission snapshot", () => {
  assert.match(migration, /percentage_snapshot numeric\(5,2\) not null/);
  assert.match(migration, /pct numeric\(5,2\) := 50/);
  assert.match(migration, /accrued := round\(net_paid \* pct \/ 100,2\)/);
});

test("net profit preview deducts refunds, coach commissions, and operating expenses before partner shares", () => {
  assert.match(migration, /gross_income-t\.refunds-c\.amount-t\.operating_expenses/);
  assert.match(migration, /case name when 'Dr Abdul Hakim' then 45 when 'Zaher' then 10 else 45/);
  assert.match(migration, /\('Dr Abdul Hakim','investor'\),\('Zaher','management'\),\('Coach Fahd','partner'\)/);
});

test("demo seed is explicitly guarded and covers a 90-day payment history", () => {
  assert.match(seed, /app\.ko_demo_seed/);
  assert.match(seed, /for d in 1\.\.90 loop/);
  assert.match(seed, /refunded_amount=25000/);
});
