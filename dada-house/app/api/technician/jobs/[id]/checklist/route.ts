import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ChecklistItem = { key: string; label: string; checked: boolean; note: string };

const CHECKLISTS: Record<string, ChecklistItem[]> = {
  plumbing: [
    { key: "leak_source", label: "Check leak source", checked: false, note: "" },
    { key: "water_pressure", label: "Inspect water pressure", checked: false, note: "" },
    { key: "pipes", label: "Inspect pipes", checked: false, note: "" },
    { key: "test_repair", label: "Test repair", checked: false, note: "" },
    { key: "clean_area", label: "Clean work area", checked: false, note: "" },
  ],
  "air-conditioning": [
    { key: "thermostat", label: "Check thermostat", checked: false, note: "" },
    { key: "filter", label: "Check filter", checked: false, note: "" },
    { key: "refrigerant", label: "Check refrigerant level", checked: false, note: "" },
    { key: "capacitor", label: "Check capacitor", checked: false, note: "" },
    { key: "condenser", label: "Inspect condenser", checked: false, note: "" },
    { key: "evaporator_coil", label: "Check evaporator coil", checked: false, note: "" },
    { key: "cooling_test", label: "Test cooling performance", checked: false, note: "" },
  ],
  heating: [
    { key: "thermostat", label: "Check thermostat", checked: false, note: "" },
    { key: "furnace", label: "Inspect furnace", checked: false, note: "" },
    { key: "heat_pump", label: "Check heat pump", checked: false, note: "" },
    { key: "airflow", label: "Check airflow", checked: false, note: "" },
    { key: "heating_test", label: "Test heating performance", checked: false, note: "" },
  ],
  remodeling: [
    { key: "before_photos", label: "Take before photos", checked: false, note: "" },
    { key: "confirm_scope", label: "Confirm work scope with customer", checked: false, note: "" },
    { key: "confirm_materials", label: "Confirm materials on site", checked: false, note: "" },
    { key: "track_progress", label: "Track progress milestones", checked: false, note: "" },
    { key: "after_photos", label: "Take after photos", checked: false, note: "" },
  ],
  default: [
    { key: "inspect", label: "Inspect issue", checked: false, note: "" },
    { key: "diagnose", label: "Diagnose problem", checked: false, note: "" },
    { key: "repair", label: "Complete repair", checked: false, note: "" },
    { key: "test", label: "Test repair", checked: false, note: "" },
    { key: "cleanup", label: "Clean work area", checked: false, note: "" },
  ],
};

function getChecklistForService(service: string): ChecklistItem[] {
  const s = service.toLowerCase();
  if (s.includes("plumb")) return CHECKLISTS.plumbing;
  if (s.includes("ac") || s.includes("air") || s.includes("cool")) return CHECKLISTS["air-conditioning"];
  if (s.includes("heat") || s.includes("furnace")) return CHECKLISTS.heating;
  if (s.includes("remodel") || s.includes("renovation")) return CHECKLISTS.remodeling;
  return CHECKLISTS.default;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let checklist = await db.serviceChecklist.findUnique({ where: { appointmentId: id } });

  if (!checklist) {
    const appt = await db.appointment.findFirst({ where: { id }, select: { service: true } });
    if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = getChecklistForService(appt.service);
    checklist = await db.serviceChecklist.create({
      data: { appointmentId: id, serviceType: appt.service, items: items as unknown as object[] },
    });
  }

  return NextResponse.json({ checklist });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { items } = body;

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const allChecked = items.every((i: ChecklistItem) => i.checked);

  const checklist = await db.serviceChecklist.upsert({
    where: { appointmentId: id },
    create: {
      appointmentId: id,
      serviceType: "general",
      items: items as unknown as object[],
      completedAt: allChecked ? new Date() : null,
    },
    update: {
      items: items as unknown as object[],
      completedAt: allChecked ? new Date() : null,
    },
  });

  return NextResponse.json({ checklist });
}
