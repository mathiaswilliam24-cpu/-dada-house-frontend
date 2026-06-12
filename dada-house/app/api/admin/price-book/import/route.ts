import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { parseCSVRecords } from "@/lib/csv";

export const dynamic = "force-dynamic";

const toBool = (v: string) => v.trim().toUpperCase() === "TRUE";
const toNum = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { csv } = await req.json();
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
  }

  const records = parseCSVRecords(csv);

  const items = records
    .filter((r) =>
      r.name &&
      !Object.values(r).some((v) => v.toLowerCase().includes("delete before importing"))
    )
    .map((r) => ({
      industry: r.industry || "",
      category: r.category || "",
      subcategory1: r.subcategory_1 || null,
      subcategory2: r.subcategory_2 || null,
      name: r.name,
      description: r.description || null,
      price: toNum(r.price),
      cost: toNum(r.cost),
      taxable: r.taxable ? toBool(r.taxable) : true,
      unit: r.unit_of_measure && r.unit_of_measure !== "(Can be left blank)" ? r.unit_of_measure : null,
      taskCode: r.task_code || null,
      onlineBooking: r.online_booking_enabled ? toBool(r.online_booking_enabled) : false,
    }));

  if (items.length === 0) {
    return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
  }

  const result = await db.priceBookItem.createMany({ data: items });
  return NextResponse.json({ imported: result.count });
}
