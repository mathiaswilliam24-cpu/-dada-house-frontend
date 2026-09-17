import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { VentEntry } from "@/lib/duct-cleaning-fields";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: 2, borderBottomColor: "#1B3FA8", paddingBottom: 12 },
  logo: { width: 110, height: "auto" },
  title: { fontSize: 15, fontWeight: 700, color: "#1B3FA8" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1B3FA8", marginBottom: 6 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: { width: 110, color: "#6b7280" },
  infoValue: { flex: 1, color: "#111827" },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 6 },
  statBox: { padding: 8, backgroundColor: "#F0F4FF", borderRadius: 4, alignItems: "center", flex: 1 },
  statNumber: { fontSize: 16, fontWeight: 700, color: "#1B3FA8" },
  statLabel: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  checkLine: { fontSize: 9, marginBottom: 2 },
  ventCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 8, marginBottom: 8 },
  ventHeader: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  ventPhotos: { flexDirection: "row", gap: 8, marginTop: 4 },
  ventPhotoBox: { width: 110 },
  ventPhoto: { width: 110, height: 82, objectFit: "cover", borderRadius: 4 },
  ventPhotoLabel: { fontSize: 7, color: "#6b7280", marginTop: 2, textAlign: "center" },
  resultBanner: { padding: 10, borderRadius: 4, fontWeight: 700, fontSize: 12, textAlign: "center", marginBottom: 8 },
  sigBox: { width: 200, height: 60, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, marginTop: 4 },
  sigImage: { width: 200, height: 60, objectFit: "contain" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
});

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completed",
  COMPLETED_ADDITIONAL_RECOMMENDED: "Completed — Additional Service Recommended",
  INCOMPLETE: "Incomplete — Follow-up Required",
};
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#059669",
  COMPLETED_ADDITIONAL_RECOMMENDED: "#d97706",
  INCOMPLETE: "#dc2626",
};

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export type VentCleaningReportProps = {
  reportNumber: string;
  submittedAt: string | Date;
  technicianName: string | null;
  customer: { name: string; phone: string; address: string; city: string; zipCode: string };
  propertyType: string | null;
  totalVentsAuthorized: number | null;
  supplyVentsAuthorized: number | null;
  returnVentsAuthorized: number | null;
  overallCondition: string[];
  workPerformed: string[];
  additionalFindings: string[];
  recommendedAdditionalService: string | null;
  vents: VentEntry[];
  totalVentsCleaned: number | null;
  completionStatus: string | null;
  technicianNotes: string | null;
  technicianSignatureUrl: string | null;
  customerSignatureUrl: string | null;
};

export function VentCleaningReportDocument(p: VentCleaningReportProps) {
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
            <Text style={styles.title}>Air Vent & Register{"\n"}Cleaning Report</Text>
            <Text style={styles.subtitle}>Report {p.reportNumber}</Text>
            <Text style={styles.subtitle}>{new Date(p.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer</Text><Text style={styles.infoValue}>{p.customer.name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{p.customer.address}, {p.customer.city} {p.customer.zipCode}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Property Type</Text><Text style={styles.infoValue}>{p.propertyType ?? "—"}</Text></View>
          {p.technicianName && <View style={styles.infoRow}><Text style={styles.infoLabel}>Technician</Text><Text style={styles.infoValue}>{p.technicianName}</Text></View>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.totalVentsAuthorized ?? "—"}</Text><Text style={styles.statLabel}>Vents Authorized</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.vents.length}</Text><Text style={styles.statLabel}>Vents Documented</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{p.totalVentsCleaned ?? p.vents.length}</Text><Text style={styles.statLabel}>Vents Cleaned</Text></View>
        </View>

        {p.overallCondition.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Initial Condition</Text>
            <Text>{p.overallCondition.join(", ")}</Text>
          </View>
        )}

        {p.workPerformed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Performed</Text>
            {p.workPerformed.map((w) => <Text key={w} style={styles.checkLine}>✓ {w}</Text>)}
          </View>
        )}

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Vent-by-Vent Documentation</Text>
          {p.vents.map((v, i) => {
            const before = v.beforePhotoUrl && isImageUrl(v.beforePhotoUrl) ? v.beforePhotoUrl : null;
            const after = v.afterPhotoUrl && isImageUrl(v.afterPhotoUrl) ? v.afterPhotoUrl : null;
            return (
              <View key={v.id} style={styles.ventCard} wrap={false}>
                <Text style={styles.ventHeader}>{i + 1}. {v.roomLocation || "Unnamed location"} — {v.ventType || "—"}</Text>
                <Text>Before: {v.conditionBefore || "—"}  ·  After: {v.conditionAfter || "—"}</Text>
                <Text>Cover removed: {v.coverRemoved ? "Yes" : "No"}  ·  Cover cleaned: {v.coverCleaned ? "Yes" : "No"}  ·  Opening cleaned: {v.openingCleaned ? "Yes" : "No"}  ·  Reinstalled: {v.reinstalled ? "Yes" : "No"}</Text>
                {v.notes && <Text>Notes: {v.notes}</Text>}
                {(before || after) && (
                  <View style={styles.ventPhotos}>
                    {before && (
                      <View style={styles.ventPhotoBox}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={before} style={styles.ventPhoto} />
                        <Text style={styles.ventPhotoLabel}>Before</Text>
                      </View>
                    )}
                    {after && (
                      <View style={styles.ventPhotoBox}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={after} style={styles.ventPhoto} />
                        <Text style={styles.ventPhotoLabel}>After</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {p.additionalFindings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Findings</Text>
            {p.additionalFindings.map((f) => <Text key={f} style={styles.checkLine}>• {f}</Text>)}
            {p.recommendedAdditionalService && <Text style={{ marginTop: 4 }}>Recommended: {p.recommendedAdditionalService}</Text>}
          </View>
        )}

        {p.completionStatus && (
          <Text style={[styles.resultBanner, { color: STATUS_COLORS[p.completionStatus] ?? "#111827", borderWidth: 1, borderColor: STATUS_COLORS[p.completionStatus] ?? "#e5e7eb" }]}>
            {STATUS_LABELS[p.completionStatus] ?? p.completionStatus}
          </Text>
        )}
        {p.technicianNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technician Notes</Text>
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
          Service Scope: Air Vent & Register Cleaning includes cleaning accessible supply and return register covers, grilles, and accessible areas immediately behind the openings included in the approved service. This service does not constitute complete air duct system cleaning.
        </Text>

        <Text style={styles.footer}>DADA HOUSE — Air Conditioning, Heating, Plumbing & Remodeling · (844) 928-0875 · www.dada-house.com</Text>
      </Page>
    </Document>
  );
}

export async function renderVentCleaningReportPdf(props: VentCleaningReportProps): Promise<Buffer> {
  return renderToBuffer(<VentCleaningReportDocument {...props} />);
}
