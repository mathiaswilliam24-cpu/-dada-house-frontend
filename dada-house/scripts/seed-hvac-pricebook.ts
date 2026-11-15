/**
 * Adds the DADA HOUSE flat-rate HVAC price book (scripts/data/hvac-pricebook-2026-11.ts)
 * with the owner's 30% reduction applied. Idempotent: items whose taskCode already
 * exists are skipped.
 *
 *   npx tsx --env-file=.env scripts/seed-hvac-pricebook.ts           # dry run
 *   npx tsx --env-file=.env scripts/seed-hvac-pricebook.ts --apply   # write
 */
import { db } from "@/lib/db";
import { HVAC_PRICEBOOK } from "./data/hvac-pricebook-2026-11";

const DISCOUNT = 0.3;
const apply = process.argv.includes("--apply");

async function main() {
  const codes = HVAC_PRICEBOOK.map((i) => i.code);
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupes.length) throw new Error(`Duplicate codes in data: ${dupes.join(", ")}`);

  const existing = new Set(
    (await db.priceBookItem.findMany({ where: { taskCode: { in: codes } }, select: { taskCode: true } })).map((r) => r.taskCode)
  );

  const rows = HVAC_PRICEBOOK.filter((i) => !existing.has(i.code)).map((i) => ({
    industry: "HVAC",
    category: i.category,
    subcategory1: i.subcategory ?? null,
    name: i.name,
    description: i.description,
    price: Math.round(i.listPrice * (1 - DISCOUNT) * 100) / 100,
    taskCode: i.code,
  }));

  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
  console.log(`${HVAC_PRICEBOOK.length} items in data, ${existing.size} already present, ${rows.length} to add`);
  for (const [cat, n] of byCat) console.log(`  ${cat}: ${n}`);
  for (const r of rows.slice(0, 3)) console.log(`  e.g. ${r.taskCode} ${r.name}: $${r.price}`);

  if (!apply) {
    console.log("Dry run — re-run with --apply to write.");
    return;
  }
  const res = await db.priceBookItem.createMany({ data: rows });
  console.log(`Inserted ${res.count} items.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
