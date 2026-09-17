import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: 2, borderBottomColor: "#1B3FA8", paddingBottom: 12 },
  logo: { width: 110, height: "auto" },
  title: { fontSize: 16, fontWeight: 700, color: "#1B3FA8" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1B3FA8", marginBottom: 6 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: { width: 90, color: "#6b7280" },
  infoValue: { flex: 1, color: "#111827" },
  textBlock: { backgroundColor: "#f9fafb", borderRadius: 4, padding: 10, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 8 },
  textBlockLabel: { fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  textBlockValue: { color: "#111827", lineHeight: 1.4 },
  urgencyBadge: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, fontWeight: 700, fontSize: 10 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  photoBox: { width: 140 },
  photo: { width: 140, height: 105, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 7, color: "#6b7280", marginTop: 2, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
});

const URGENCY_COLORS: Record<string, string> = {
  NORMAL: "#16a34a",
  RECOMMENDED: "#ca8a04",
  URGENT: "#ea580c",
  EMERGENCY: "#dc2626",
};

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export type DiagnosticReportProps = {
  reportNumber: string;
  submittedAt: string | Date;
  technicianName: string | null;
  customer: { name: string; phone: string; address: string; city: string; zipCode: string };
  serviceTypeLabel: string;
  customerReportedIssue: string | null;
  equipmentInspected: string | null;
  problemFound: string | null;
  rootCause: string | null;
  evidenceSupportingDiagnosis: string | null;
  affectedComponents: string | null;
  recommendedRepair: string | null;
  additionalRecommendations: string | null;
  repairUrgency: string | null;
  canCustomerContinueUsing: string | null;
  finalDiagnosis: string | null;
  recommendedCorrectiveWork: string | null;
  systemStatusWhenLeaving: string | null;
  photos: { url: string; caption: string }[];
};

export function DiagnosticReportDocument(p: DiagnosticReportProps) {
  const photos = p.photos.filter((ph) => isImageUrl(ph.url));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="https://www.dada-house.com/logo%20dada%20house.png" style={styles.logo} />
            <Text style={styles.subtitle}>7001 South Texas 6 STE 246, Houston, TX 77083</Text>
            <Text style={styles.subtitle}>106 Thompson Street, Jacksonville, NC 28540</Text>
            <Text style={styles.subtitle}>(844) 928-0875 · www.dada-house.com</Text>
          </View>
          <View>
            <Text style={styles.title}>Service Diagnostic Report</Text>
            <Text style={styles.subtitle}>Report {p.reportNumber}</Text>
            <Text style={styles.subtitle}>{new Date(p.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Service Details</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer</Text><Text style={styles.infoValue}>{p.customer.name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{p.customer.phone}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{p.customer.address}, {p.customer.city} {p.customer.zipCode}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Service Type</Text><Text style={styles.infoValue}>{p.serviceTypeLabel}</Text></View>
          {p.technicianName && <View style={styles.infoRow}><Text style={styles.infoLabel}>Technician</Text><Text style={styles.infoValue}>{p.technicianName}</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Concern</Text>
          <View style={styles.textBlock}><Text style={styles.textBlockValue}>{p.customerReportedIssue || "—"}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Performed</Text>
          <View style={styles.textBlock}><Text style={styles.textBlockValue}>{p.equipmentInspected || "—"}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostic Findings</Text>
          <View style={styles.textBlock}>
            <Text style={styles.textBlockLabel}>Problem Found</Text>
            <Text style={styles.textBlockValue}>{p.problemFound || "—"}</Text>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.textBlockLabel}>Root Cause</Text>
            <Text style={styles.textBlockValue}>{p.rootCause || "—"}</Text>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.textBlockLabel}>Evidence Supporting Diagnosis</Text>
            <Text style={styles.textBlockValue}>{p.evidenceSupportingDiagnosis || "—"}</Text>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.textBlockLabel}>Affected Component(s)</Text>
            <Text style={styles.textBlockValue}>{p.affectedComponents || "—"}</Text>
          </View>
          {p.additionalRecommendations && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockLabel}>Additional Recommendations</Text>
              <Text style={styles.textBlockValue}>{p.additionalRecommendations}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Corrective Work</Text>
          <View style={styles.textBlock}><Text style={styles.textBlockValue}>{p.recommendedRepair || p.recommendedCorrectiveWork || "—"}</Text></View>
          {p.repairUrgency && (
            <Text style={[styles.urgencyBadge, { color: URGENCY_COLORS[p.repairUrgency] ?? "#111827", borderColor: URGENCY_COLORS[p.repairUrgency] ?? "#e5e7eb", borderWidth: 1 }]}>
              {p.repairUrgency.replace(/_/g, " ")}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Final Diagnosis</Text><Text style={styles.infoValue}>{p.finalDiagnosis || "—"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Status</Text><Text style={styles.infoValue}>{p.systemStatusWhenLeaving || "—"}</Text></View>
          {p.canCustomerContinueUsing && (
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Continued Use</Text><Text style={styles.infoValue}>{p.canCustomerContinueUsing.replace(/_/g, " ")}</Text></View>
          )}
        </View>

        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photosGrid}>
              {photos.map((ph, i) => (
                <View key={i} style={styles.photoBox}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={ph.url} style={styles.photo} />
                  {ph.caption && <Text style={styles.photoCaption}>{ph.caption}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footer}>DADA HOUSE — Air Conditioning, Heating, Plumbing & Remodeling · (844) 928-0875 · www.dada-house.com</Text>
      </Page>
    </Document>
  );
}

export async function renderDiagnosticReportPdf(props: DiagnosticReportProps): Promise<Buffer> {
  return renderToBuffer(<DiagnosticReportDocument {...props} />);
}
