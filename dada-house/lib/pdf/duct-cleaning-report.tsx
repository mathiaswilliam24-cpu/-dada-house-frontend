import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { RegisterEntry, ComponentState } from "@/lib/duct-cleaning-fields";
import { DUCT_COMPONENTS, DUCT_PHOTO_CATEGORIES, type DuctPhotoCategory } from "@/lib/duct-cleaning-fields";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: 2, borderBottomColor: "#1B3FA8", paddingBottom: 12 },
  logo: { width: 110, height: "auto" },
  title: { fontSize: 15, fontWeight: 700, color: "#1B3FA8" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1B3FA8", marginBottom: 6 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: { width: 130, color: "#6b7280" },
  infoValue: { flex: 1, color: "#111827" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 6, flexWrap: "wrap" },
  statBox: { padding: 8, backgroundColor: "#F0F4FF", borderRadius: 4, alignItems: "center", flex: 1, minWidth: 90 },
  statNumber: { fontSize: 16, fontWeight: 700, color: "#1B3FA8" },
  statLabel: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  checkLine: { fontSize: 9, marginBottom: 2 },
  entryCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 8, marginBottom: 8 },
  entryHeader: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  entryPhotos: { flexDirection: "row", gap: 8, marginTop: 4 },
  entryPhotoBox: { width: 110 },
  entryPhoto: { width: 110, height: 82, objectFit: "cover", borderRadius: 4 },
  entryPhotoLabel: { fontSize: 7, color: "#6b7280", marginTop: 2, textAlign: "center" },
  compTable: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
  compRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 4, paddingHorizontal: 6 },
  compRowHeader: { backgroundColor: "#F8FAFC", fontWeight: 700 },
  compCell0: { flex: 2 },
  compCell: { flex: 1, textAlign: "center" },
  photoPairRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  photoPairCol: { flex: 1 },
  photoPairImg: { width: "100%", height: 110, objectFit: "cover", borderRadius: 4 },
  photoPairLabel: { fontSize: 8, fontWeight: 700, color: "#6b7280", marginBottom: 3 },
  resultBanner: { padding: 10, borderRadius: 4, fontWeight: 700, fontSize: 12, textAlign: "center", marginBottom: 8 },
  sigBox: { width: 200, height: 60, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, marginTop: 4 },
  sigImage: { width: 200, height: 60, objectFit: "contain" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
});

const CONDITION_LABELS: Record<string, string> = {
  NORMAL: "Normal Operation",
  ADDITIONAL_WORK_RECOMMENDED: "Operational — Additional Work Recommended",
  SERVICE_REQUIRED: "Service Required",
  NOT_OPERATED: "System Not Operated",
};
const CONDITION_COLORS: Record<string, string> = {
  NORMAL: "#059669",
  ADDITIONAL_WORK_RECOMMENDED: "#d97706",
  SERVICE_REQUIRED: "#dc2626",
  NOT_OPERATED: "#6b7280",
};

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export type DuctCleaningReportProps = {
  reportNumber: string;
  submittedAt: string | Date;
  technicianName: string | null;
  customer: { name: string; phone: string; address: string; city: string; zipCode: string };
  propertyType: string | null;
  systemsCount: number | null;
  totalSupplyRegisters: number | null;
  totalReturnRegisters: number | null;
  ductMaterial: string | null;
  contaminationObserved: string[];
  systemProblemsFound: string[];
  technicianFindings: string | null;
  cleaningProcedure: string[];
  registers: RegisterEntry[];
  componentCleaning: Record<string, ComponentState>;
  additionalIssueFound: boolean;
  issuesFound: string[];
  additionalRepairRecommended: string | null;
  separateEstimateRequired: boolean | null;
  systemConditionAfter: string | null;
  beforePhotos: { category: string; url: string }[];
  afterPhotos: { category: string; url: string }[];
  technicianNotes: string | null;
  technicianSignatureUrl: string | null;
  customerSignatureUrl: string | null;
};

export function DuctCleaningReportDocument(p: DuctCleaningReportProps) {
  const beforeByCategory = new Map(p.beforePhotos.map((b) => [b.category, b.url]));
  const afterByCategory = new Map(p.afterPhotos.map((a) => [a.category, a.url]));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="https://www.dada-house.com/logo%20dada%20house.png" style={styles.logo} />
            <Text style={styles.subtitle}>TX: 7001 South Texas 6 STE 246, Houston, TX 77083</Text>
            <Text style={styles.subtitle}>NC: 106 Thompson Street, Jacksonville, NC 28540</Text>
            <Text style={styles.subtitle}>(844) 928-0875 · www.dada-house.com</Text>
          </View>
          <View>
            <Text style={styles.title}>Air Duct Cleaning{"\n"}Completion Report</Text>
            <Text style={styles.subtitle}>Report {p.reportNumber}</Text>
            <Text style={styles.subtitle}>{new Date(p.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job & System Information</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer</Text><Text style={styles.infoValue}>{p.customer.name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{p.customer.address}, {p.customer.city} {p.customer.zipCode}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Property Type</Text><Text style={styles.infoValue}>{p.propertyType ?? "—"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Duct Material</Text><Text style={styles.infoValue}>{p.ductMaterial ?? "—"}</Text></View>
          {p.technicianName && <View style={styles.infoRow}><Text style={styles.infoLabel}>Technician</Text><Text style={styles.infoValue}>{p.technicianName}</Text></View>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.registers.length}</Text><Text style={styles.statLabel}>Registers Serviced</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.totalSupplyRegisters ?? "—"}</Text><Text style={styles.statLabel}>Supply Registers</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.totalReturnRegisters ?? "—"}</Text><Text style={styles.statLabel}>Return Registers</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.systemsCount ?? "—"}</Text><Text style={styles.statLabel}>HVAC Systems</Text></View>
        </View>

        {p.contaminationObserved.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contamination/Debris Observed</Text>
            <Text>{p.contaminationObserved.join(", ")}</Text>
          </View>
        )}

        {p.cleaningProcedure.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cleaning Procedure</Text>
            {p.cleaningProcedure.map((w) => <Text key={w} style={styles.checkLine}>✓ {w}</Text>)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HVAC Component Cleaning</Text>
          <View style={styles.compTable}>
            <View style={[styles.compRow, styles.compRowHeader]}>
              <Text style={styles.compCell0}>Component</Text>
              <Text style={styles.compCell}>Inspected</Text>
              <Text style={styles.compCell}>Cleaned</Text>
              <Text style={styles.compCell}>N/A</Text>
            </View>
            {DUCT_COMPONENTS.map((c) => {
              const s = p.componentCleaning[c.key];
              return (
                <View key={c.key} style={styles.compRow}>
                  <Text style={styles.compCell0}>{c.label}</Text>
                  <Text style={styles.compCell}>{s?.inspected ? "✓" : ""}</Text>
                  <Text style={styles.compCell}>{s?.cleaned ? "✓" : ""}</Text>
                  <Text style={styles.compCell}>{s?.na ? "✓" : ""}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Register-by-Register Documentation</Text>
          {p.registers.map((r, i) => {
            const before = r.beforePhotoUrl && isImageUrl(r.beforePhotoUrl) ? r.beforePhotoUrl : null;
            const after = r.afterPhotoUrl && isImageUrl(r.afterPhotoUrl) ? r.afterPhotoUrl : null;
            return (
              <View key={r.id} style={styles.entryCard} wrap={false}>
                <Text style={styles.entryHeader}>{i + 1}. {r.location || "Unnamed location"} — {r.type || "—"}</Text>
                <Text>Before: {r.beforeCondition || "—"}  ·  Cleaned: {r.cleaned ? "Yes" : "No"}  ·  After: {r.afterCondition || "—"}</Text>
                {r.notes && <Text>Notes: {r.notes}</Text>}
                {(before || after) && (
                  <View style={styles.entryPhotos}>
                    {before && (
                      <View style={styles.entryPhotoBox}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={before} style={styles.entryPhoto} />
                        <Text style={styles.entryPhotoLabel}>Before</Text>
                      </View>
                    )}
                    {after && (
                      <View style={styles.entryPhotoBox}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={after} style={styles.entryPhoto} />
                        <Text style={styles.entryPhotoLabel}>After</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Before & After — Job Site</Text>
          {(Object.keys(DUCT_PHOTO_CATEGORIES) as DuctPhotoCategory[]).map((cat) => {
            const before = beforeByCategory.get(cat);
            const after = afterByCategory.get(cat);
            if (!before && !after) return null;
            return (
              <View key={cat} style={styles.photoPairRow} wrap={false}>
                <View style={styles.photoPairCol}>
                  <Text style={styles.photoPairLabel}>BEFORE — {DUCT_PHOTO_CATEGORIES[cat]}</Text>
                  {before && isImageUrl(before) && (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={before} style={styles.photoPairImg} />
                  )}
                </View>
                <View style={styles.photoPairCol}>
                  <Text style={styles.photoPairLabel}>AFTER — {DUCT_PHOTO_CATEGORIES[cat]}</Text>
                  {after && isImageUrl(after) && (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={after} style={styles.photoPairImg} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {p.additionalIssueFound && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Problems Discovered During Cleaning</Text>
            {p.issuesFound.map((f) => <Text key={f} style={styles.checkLine}>• {f}</Text>)}
            {p.additionalRepairRecommended && <Text style={{ marginTop: 4 }}>Recommended repair: {p.additionalRepairRecommended}</Text>}
            {p.separateEstimateRequired && <Text style={{ color: "#dc2626", marginTop: 2 }}>A separate estimate is required for this additional work.</Text>}
          </View>
        )}

        {p.systemConditionAfter && (
          <Text style={[styles.resultBanner, { color: CONDITION_COLORS[p.systemConditionAfter] ?? "#111827", borderWidth: 1, borderColor: CONDITION_COLORS[p.systemConditionAfter] ?? "#e5e7eb" }]}>
            System Condition After Service: {CONDITION_LABELS[p.systemConditionAfter] ?? p.systemConditionAfter}
          </Text>
        )}
        {p.technicianNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technician Findings</Text>
            <Text>{p.technicianNotes}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technician Signature</Text>
          {p.technicianSignatureUrl && (
            <View style={styles.sigBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={p.technicianSignatureUrl} style={styles.sigImage} />
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Signature</Text>
          {p.customerSignatureUrl && (
            <View style={styles.sigBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={p.customerSignatureUrl} style={styles.sigImage} />
            </View>
          )}
        </View>

        <Text style={{ fontSize: 8, color: "#9ca3af", marginTop: 8 }}>
          Service Scope: Whole-System Air Duct Cleaning includes only the components specifically identified in the approved estimate and documented as cleaned on this service report. HVAC repairs, duct replacement, refrigerant service, electrical repairs, coil/blower cleaning, and drain repairs are not included unless specifically listed in the approved estimate. Visual observations of discoloration or suspected microbial growth are not laboratory identification or environmental testing. Pre-existing damaged, deteriorated, disconnected, wet, or improperly installed ductwork discovered during service will be documented and may require a separate estimate.
        </Text>

        <Text style={styles.footer}>DADA HOUSE — Air Conditioning, Heating, Plumbing & Remodeling · (844) 928-0875 · www.dada-house.com</Text>
      </Page>
    </Document>
  );
}

export async function renderDuctCleaningReportPdf(props: DuctCleaningReportProps): Promise<Buffer> {
  return renderToBuffer(<DuctCleaningReportDocument {...props} />);
}
