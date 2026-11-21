import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const APPROVERS = ["ADMIN", "SUPER_ADMIN"];

/** Manufacturer reference library (per model prefix). Values come from manufacturer documents and are
 *  used in diagnostics only once approved by an administrator other than the person who entered them. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN", "SUPER_ADMIN", "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const models = await db.hvacModelSpec.findMany({ orderBy: [{ status: "asc" }, { manufacturer: "asc" }, { modelPrefix: "asc" }] });
  return NextResponse.json({ models, canApprove: APPROVERS.includes(auth.role), me: auth.id });
}

const n = z.number().finite().nullable().optional();
const specs = z.object({
  targetSubcooling: n, targetSuperheat: n, chargeTolerance: n, tempRiseMin: n, tempRiseMax: n, maxTesp: n, ratedCfm: n,
  manifoldMin: n, manifoldMax: n, inletMin: n, inletMax: n,
  suctionTargetPsig: n, highTargetPsig: n, pressureTolerancePsi: n, cfmTolerancePct: n, filterMaxDrop: n, coilMaxDrop: n, indoorWbMin: n, indoorWbMax: n, outdoorDbMin: n, outdoorDbMax: n, ofmFla: n, blowerFla: n,
}).partial();
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"), id: z.string().optional(),
    manufacturer: z.string().trim().min(2).max(60), modelPrefix: z.string().trim().min(2).max(60), description: z.string().trim().max(200).nullable().optional(),
    specs, sourceDocument: z.string().trim().min(3).max(300), notes: z.string().trim().max(1000).nullable().optional(),
  }),
  z.object({ action: z.literal("approve"), id: z.string() }),
  z.object({ action: z.literal("retire"), id: z.string() }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN", "SUPER_ADMIN", "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const a = parsed.data;
  if (a.action === "save") {
    const cleanSpecs = Object.fromEntries(Object.entries(a.specs).filter(([, v]) => v != null));
    if (!Object.keys(cleanSpecs).length) return NextResponse.json({ error: "Enter at least one manufacturer value." }, { status: 400 });
    const data = {
      manufacturer: a.manufacturer, modelPrefix: a.modelPrefix, description: a.description ?? null, specs: cleanSpecs, sourceDocument: a.sourceDocument, notes: a.notes ?? null,
      // Any edit sends it back for approval.
      status: "PENDING", createdById: auth.id, createdByName: auth.name ?? null, approvedById: null, approvedByName: null, approvedAt: null,
    };
    const m = a.id ? await db.hvacModelSpec.update({ where: { id: a.id }, data }) : await db.hvacModelSpec.create({ data });
    return NextResponse.json({ model: m });
  }
  if (!APPROVERS.includes(auth.role)) return NextResponse.json({ error: "Only administrators can approve or retire." }, { status: 403 });
  const m = await db.hvacModelSpec.findUnique({ where: { id: a.id } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (a.action === "approve") {
    if (m.createdById === auth.id && auth.role !== "SUPER_ADMIN") return NextResponse.json({ error: "A different administrator must approve data you entered." }, { status: 400 });
    const u = await db.hvacModelSpec.update({ where: { id: m.id }, data: { status: "APPROVED", approvedById: auth.id, approvedByName: auth.name ?? null, approvedAt: new Date() } });
    return NextResponse.json({ model: u });
  }
  const u = await db.hvacModelSpec.update({ where: { id: m.id }, data: { status: "RETIRED" } });
  return NextResponse.json({ model: u });
}
