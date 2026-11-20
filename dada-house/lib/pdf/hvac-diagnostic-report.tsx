import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { FIELD_BY_KEY, COMPLAINTS, MODES, categoryInfo, METERING_DEVICES, COMPRESSOR_TYPES } from "@/lib/hvac/catalog";
import type { AnalysisResult } from "@/lib/hvac/server";
import type { Hypothesis } from "@/lib/hvac/rules";

const C = { blue: "#1B3FA8", gray: "#6b7280", line: "#e5e7eb", red: "#dc2626", amber: "#b45309", green: "#15803d" };
const st = StyleSheet.create({
  page: { padding: 30, paddingBottom: 50, fontSize: 9, fontFamily: "Helvetica", color: "#111827" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: 2, borderBottomColor: C.blue, paddingBottom: 10, marginBottom: 12 },
  logo: { width: 105 },
  title: { fontSize: 15, fontWeight: 700, color: C.blue, textAlign: "right" },
  sub: { fontSize: 8, color: C.gray, textAlign: "right", marginTop: 1 },
  small: { fontSize: 8, color: C.gray },
  h: { fontSize: 11, fontWeight: 700, color: C.blue, marginTop: 10, marginBottom: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", flexDirection: "row", marginBottom: 2 },
  k: { width: 95, color: C.gray },
  v: { flex: 1 },
  tr: { flexDirection: "row", borderBottom: 1, borderBottomColor: C.line, paddingVertical: 2.5 },
  th: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 3, fontWeight: 700 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 7, marginBottom: 6 },
  badge: { fontSize: 7.5, fontWeight: 700, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, color: "#fff" },
  alert: { borderRadius: 4, padding: 6, marginBottom: 4 },
  footer: { position: "absolute", bottom: 18, left: 30, right: 30, fontSize: 7, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: C.line, paddingTop: 5 },
  photo: { width: 125, height: 94, objectFit: "cover", borderRadius: 3, marginRight: 6, marginBottom: 6 },
});

const STATUS_LABEL: Record<string, [string, string]> = {
  CONFIRMED: ["Confirmed by technician", C.green], STRONGLY_SUSPECTED: ["Strongly suspected", C.amber],
  POSSIBLE: ["Possible", "#6b7280"], INSUFFICIENT_DATA: ["Insufficient data", "#9ca3af"], RULED_OUT: ["Ruled out by technician", "#9ca3af"],
};
const LEAVING: Record<string, string> = {
  OPERATING_NORMALLY: "Operating normally", OPERATING_TEMPORARILY: "Operating temporarily", NOT_OPERATIONAL: "Not operational",
  SHUT_DOWN_FOR_SAFETY: "Shut down for safety", DIAGNOSTIC_ONLY: "Diagnostic only",
};
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

type Findings = { verifiedFindings?: string; repairsPerformed?: string; recommendations?: string; partsUsed?: string; statusOnLeaving?: string; customerName?: string; customerAcknowledged?: boolean };

export async function renderHvacReportPdf(sessionId: string): Promise<Buffer | null> {
  const s = await db.hvacDiagnosticSession.findUnique({
    where: { id: sessionId },
    include: {
      measurements: { orderBy: [{ circuit: "asc" }, { key: "asc" }] },
      scans: { where: { status: "APPLIED" }, select: { imageUrls: true } },
      appointment: { select: { appointmentNumber: true, name: true, phone: true, address: true, city: true, zipCode: true } },
    },
  });
  if (!s) return null;
  // Built-in PDF fonts lack some glyphs (− ✓): normalize them.
  const r = (s.results ? JSON.parse(JSON.stringify(s.results).replace(/−/g, "-").replace(/✓ ?/g, "").replace(/✗ ?/g, "")) : null) as AnalysisResult | null;
  const eq = (s.equipment ?? {}) as Record<string, unknown> & { specs?: Record<string, number | null> };
  const f = (s.findings ?? {}) as Findings;
  const hyps = r?.rules?.hypotheses ?? [];
  const confirmed = hyps.filter((h) => h.status === "CONFIRMED");
  const automated = hyps.filter((h) => h.status !== "CONFIRMED" && h.status !== "RULED_OUT");
  const ruledOut = hyps.filter((h) => h.status === "RULED_OUT");
  const photos = s.scans.flatMap((x) => (Array.isArray(x.imageUrls) ? (x.imageUrls as string[]) : [])).slice(0, 8);
  const circuits = s.circuits;
  const date = (s.completedAt ?? s.updatedAt).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });

  const info = (k: string, v: unknown) => (v == null || v === "" ? null : (
    <View style={st.cell} key={k}><Text style={st.k}>{k}</Text><Text style={st.v}>{String(v)}</Text></View>
  ));
  const HypBlock = ({ h }: { h: Hypothesis }) => {
    const [label, color] = STATUS_LABEL[h.status];
    return (
      <View style={st.box} wrap={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
          <Text style={{ fontWeight: 700, fontSize: 10 }}>{h.fault}</Text>
          <Text style={[st.badge, { backgroundColor: color }]}>{label}</Text>
        </View>
        {h.support.length > 0 && <Text>Supporting evidence: {h.support.join("; ")}.</Text>}
        {h.contradict.length > 0 && <Text style={{ color: C.amber }}>Contradicting evidence: {h.contradict.join("; ")}.</Text>}
        {h.missing.length > 0 && <Text style={st.small}>Missing evidence: {h.missing.join("; ")}.</Text>}
        <Text style={{ marginTop: 2 }}>Confirmation test: {h.confirmationTest}</Text>
        {h.safety && <Text style={{ color: C.red }}>Safety: {h.safety}</Text>}
        {h.decision?.note && <Text style={{ marginTop: 2 }}>Technician note: {h.decision.note}</Text>}
        {h.status === "CONFIRMED" && (
          <View style={{ marginTop: 3 }}>
            {h.corrective.repair && <Text>• Repair: {h.corrective.repair}</Text>}
            {h.corrective.clean && <Text>• Clean: {h.corrective.clean}</Text>}
            {h.corrective.adjust && <Text>• Adjust: {h.corrective.adjust}</Text>}
            {h.corrective.replace && <Text>• Replace: {h.corrective.replace}</Text>}
            <Text>• Verify afterwards: {h.corrective.verify}</Text>
          </View>
        )}
      </View>
    );
  };

  const doc = (
    <Document title={`HVAC Diagnostic Report ${s.reportNumber ?? ""}`}>
      <Page size="LETTER" style={st.page}>
        <View style={st.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="https://www.dada-house.com/logo%20dada%20house.png" style={st.logo} />
            <Text style={st.small}>106 Thompson Street, Jacksonville, NC 28540</Text>
            <Text style={st.small}>(844) 928-0875 · www.dada-house.com</Text>
          </View>
          <View>
            <Text style={st.title}>HVAC DIAGNOSTIC REPORT</Text>
            <Text style={st.sub}>{s.reportNumber ?? "Draft — not completed"}</Text>
            <Text style={st.sub}>{date}</Text>
            {s.appointment && <Text style={st.sub}>Work order #{s.appointment.appointmentNumber}</Text>}
          </View>
        </View>

        <Text style={st.h}>Customer & visit</Text>
        <View style={st.grid}>
          {info("Customer", s.appointment?.name)}
          {info("Phone", s.appointment?.phone)}
          {info("Property", s.appointment ? `${s.appointment.address}, ${s.appointment.city} ${s.appointment.zipCode ?? ""}` : null)}
          {info("Technician", s.technicianName)}
          {info("Complaint", s.complaint ? (s.complaint === "OTHER" ? s.complaintOther : COMPLAINTS[s.complaint as keyof typeof COMPLAINTS]) : null)}
          {info("Operating mode", s.mode ? MODES[s.mode as keyof typeof MODES] : null)}
        </View>

        <Text style={st.h}>Equipment (nameplate, verified by technician)</Text>
        <View style={st.grid}>
          {info("Type", categoryInfo(eq.category as string)?.label)}
          {info("Manufacturer", eq.manufacturer)}
          {info("Model", eq.modelNumber)}
          {info("Serial", eq.serialNumber)}
          {info("Indoor / coil", eq.indoorModel)}
          {info("Location", eq.location)}
          {info("Capacity", eq.capacityTons != null ? `${eq.capacityTons} tons` : null)}
          {info("Refrigerant", r?.refrigerant ? `${r.refrigerant.label} (${r.refrigerant.safetyClass})` : eq.refrigerant)}
          {info("Metering", eq.meteringDevice ? METERING_DEVICES[eq.meteringDevice as keyof typeof METERING_DEVICES] : null)}
          {info("Compressor", eq.compressorType ? COMPRESSOR_TYPES[eq.compressorType as keyof typeof COMPRESSOR_TYPES] : null)}
          {info("Voltage", eq.ratedVoltage ? `${eq.ratedVoltage}${eq.phase ? ` · ${eq.phase}-phase` : ""}` : null)}
          {info("RLA / LRA", eq.rla != null || eq.lra != null ? `${eq.rla ?? "—"} A / ${eq.lra ?? "—"} A` : null)}
          {info("MCA / MOCP", eq.mca != null || eq.mocp != null ? `${eq.mca ?? "—"} A / ${eq.mocp ?? "—"} A` : null)}
          {info("Target subcooling", eq.specs?.targetSubcooling != null ? `${eq.specs.targetSubcooling} °F` : null)}
          {info("Target superheat", eq.specs?.targetSuperheat != null ? `${eq.specs.targetSuperheat} °F` : null)}
        </View>

        {r && r.alerts.filter((a) => a.severity !== "INFO").length > 0 && (
          <>
            <Text style={st.h}>Safety warnings & alerts</Text>
            {r.alerts.filter((a) => a.severity !== "INFO").map((a) => (
              <View key={`${a.code}${a.circuit ?? ""}`} style={[st.alert, { backgroundColor: a.severity === "CRITICAL" ? "#fee2e2" : "#fef3c7" }]} wrap={false}>
                <Text style={{ fontWeight: 700, color: a.severity === "CRITICAL" ? C.red : C.amber }}>{a.severity === "CRITICAL" ? "CRITICAL — " : ""}{a.circuit && circuits > 1 ? `Circuit ${a.circuit}: ` : ""}{a.message}</Text>
                {a.action && <Text>{a.action}</Text>}
              </View>
            ))}
          </>
        )}

        <Text style={st.h}>Measured values</Text>
        <View style={st.th}><Text style={{ width: "50%", paddingLeft: 4 }}>Measurement</Text><Text style={{ width: "20%" }}>Value</Text><Text style={{ width: "15%" }}>Circuit</Text><Text style={{ width: "15%" }}>Source</Text></View>
        {s.measurements.map((m) => {
          const fd = FIELD_BY_KEY[m.key];
          const unit = fd ? (fd.kind === "temp" || fd.kind === "tempDiff" ? "°F" : fd.kind === "pressure" ? "psig" : fd.kind === "static" ? "in. w.c." : fd.unit ?? "") : m.unit ?? "";
          const val = m.value != null ? `${fmt(m.value)} ${unit}` : (fd?.options?.[m.text ?? ""] ?? (m.text === "YES" ? "Yes" : m.text === "NO" ? "No" : m.text) ?? "");
          return (
            <View key={m.id} style={st.tr} wrap={false}>
              <Text style={{ width: "50%", paddingLeft: 4 }}>{fd?.label ?? m.key}</Text>
              <Text style={{ width: "20%" }}>{val}</Text>
              <Text style={{ width: "15%" }}>{fd?.perCircuit ? m.circuit : ""}</Text>
              <Text style={{ width: "15%" }}>{m.source === "AI_PHOTO" ? "Photo (AI), verified" : "Manual"}</Text>
            </View>
          );
        })}

        {r && r.calculated.length > 0 && (
          <>
            <Text style={st.h}>Calculated values</Text>
            {r.calculated.map((cv) => (
              <View key={`${cv.key}${cv.circuit ?? ""}`} style={st.tr} wrap={false}>
                <Text style={{ width: "40%", paddingLeft: 4 }}>{cv.label}{cv.circuit && circuits > 1 ? ` (C${cv.circuit})` : ""}</Text>
                <Text style={{ width: "15%", fontWeight: 700 }}>{fmt(cv.value)} {cv.unit}</Text>
                <Text style={{ width: "45%", color: C.gray, fontSize: 7.5 }}>{cv.formula}</Text>
              </View>
            ))}
            {r.charge.map((ch) => (
              <Text key={ch.circuit} style={{ marginTop: 3 }}>Charge check{circuits > 1 ? ` (circuit ${ch.circuit})` : ""}: {ch.reason}</Text>
            ))}
          </>
        )}

        <Text style={st.h}>Technician-confirmed findings</Text>
        {confirmed.length === 0 && <Text style={st.small}>No finding confirmed by the technician.</Text>}
        {confirmed.map((h) => <HypBlock key={h.id} h={h} />)}

        {automated.length > 0 && (
          <>
            <Text style={st.h}>Automated analysis — not confirmed</Text>
            <Text style={[st.small, { marginBottom: 4 }]}>Hypotheses generated by the rule engine from the measurements above. They are not a diagnosis until confirmed by the technician.</Text>
            {automated.map((h) => <HypBlock key={h.id} h={h} />)}
          </>
        )}
        {ruledOut.length > 0 && <Text style={[st.small, { marginTop: 4 }]}>Ruled out by the technician: {ruledOut.map((h) => h.fault + (h.decision?.note ? ` (${h.decision.note})` : "")).join("; ")}.</Text>}

        <Text style={st.h}>Work performed & recommendations</Text>
        <View style={st.box}>
          {f.verifiedFindings && <Text>Verified findings: {f.verifiedFindings}</Text>}
          {f.repairsPerformed && <Text>Repairs performed: {f.repairsPerformed}</Text>}
          {f.partsUsed && <Text>Parts used: {f.partsUsed}</Text>}
          {f.recommendations && <Text>Recommendations: {f.recommendations}</Text>}
          <Text style={{ fontWeight: 700, marginTop: 3 }}>System status when leaving: {f.statusOnLeaving ? LEAVING[f.statusOnLeaving] : "—"}</Text>
        </View>
        {s.notes && (<><Text style={st.h}>Technician notes</Text><Text>{s.notes}</Text></>)}

        {photos.length > 0 && (
          <>
            <Text style={st.h}>Photos</Text>
            <View style={st.grid}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {photos.map((u) => <Image key={u} src={u} style={st.photo} />)}
            </View>
          </>
        )}

        <Text style={st.h}>Customer acknowledgment</Text>
        <Text>{f.customerAcknowledged ? `Reviewed with ${f.customerName || "the customer"} on ${date}.` : "Not acknowledged."}</Text>

        <Text style={st.footer} fixed>
          {s.reportNumber ?? "Draft"} · {r?.engineVersion ?? ""} · {r?.rules?.rulesetVersion ?? ""} · refrigerant data {r?.ptDataVersion ?? ""} · Automated results support, and never replace, the licensed technician&apos;s judgment.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
