import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { FINAL_TEST_ITEMS, FINAL_STARTUP_RESULTS, type FinalTestKey } from "@/lib/system-startup-fields";

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
  resultBanner: { padding: 10, borderRadius: 4, fontWeight: 700, fontSize: 12, textAlign: "center", marginBottom: 8 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  photoBox: { width: 130 },
  photo: { width: 130, height: 98, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 7, color: "#6b7280", marginTop: 2, textAlign: "center" },
  sigBox: { width: 200, height: 60, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, marginTop: 4 },
  sigImage: { width: 200, height: 60, objectFit: "contain" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
});

const RESULT_COLORS: Record<string, string> = Object.fromEntries(FINAL_STARTUP_RESULTS.map((r) => [r.value, r.color]));
const RESULT_LABELS: Record<string, string> = Object.fromEntries(FINAL_STARTUP_RESULTS.map((r) => [r.value, r.label]));

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export type SystemStartupReportProps = {
  reportNumber: string;
  submittedAt: string | Date;
  technicianName: string | null;
  customer: { name: string; phone: string; address: string; city: string; zipCode: string };
  systemType: string | null;
  installationType: string | null;
  equipmentSummary: string;
  finalTestResults: Partial<Record<FinalTestKey, string>>;
  finalStartupResult: string | null;
  failExplanation: string | null;
  technicianSignatureUrl: string | null;
  customerSignatureUrl: string | null;
  photos: { url: string; caption: string }[];
};

export function SystemStartupReportDocument(p: SystemStartupReportProps) {
  const photos = p.photos.filter((ph) => isImageUrl(ph.url));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="https://www.dada-house.com/logo%20dada%20house.png" style={styles.logo} />
            <Text style={styles.subtitle}>7001 South Texas 6 STE 246, Houston, TX 77083</Text>
            <Text style={styles.subtitle}>(844) 928-0875 · www.dada-house.com</Text>
          </View>
          <View>
            <Text style={styles.title}>System Startup &{"\n"}Commissioning Report</Text>
            <Text style={styles.subtitle}>Report {p.reportNumber}</Text>
            <Text style={styles.subtitle}>{new Date(p.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Installation Details</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer</Text><Text style={styles.infoValue}>{p.customer.name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{p.customer.address}, {p.customer.city} {p.customer.zipCode}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>System Type</Text><Text style={styles.infoValue}>{p.systemType ?? "—"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Installation Type</Text><Text style={styles.infoValue}>{p.installationType ?? "—"}</Text></View>
          {p.technicianName && <View style={styles.infoRow}><Text style={styles.infoLabel}>Technician</Text><Text style={styles.infoValue}>{p.technicianName}</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Installed</Text>
          <Text>{p.equipmentSummary || "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final System Operational Test</Text>
          {FINAL_TEST_ITEMS.map((item) => (
            <View key={item.key} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{p.finalTestResults[item.key] ?? "—"}</Text>
            </View>
          ))}
          {p.finalStartupResult && (
            <Text style={[styles.resultBanner, { color: RESULT_COLORS[p.finalStartupResult] ?? "#111827", borderWidth: 1, borderColor: RESULT_COLORS[p.finalStartupResult] ?? "#e5e7eb" }]}>
              {RESULT_LABELS[p.finalStartupResult] ?? p.finalStartupResult}
            </Text>
          )}
          {p.failExplanation && <Text style={{ color: "#dc2626" }}>{p.failExplanation}</Text>}
        </View>

        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Installation Photos</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technician Certification</Text>
          <Text style={{ marginBottom: 4 }}>
            I confirm that I performed the startup and commissioning checks documented above and that the measurements entered represent the readings observed at the time of startup.
          </Text>
          {p.technicianSignatureUrl && (
            <View style={styles.sigBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={p.technicianSignatureUrl} style={styles.sigImage} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Handover Acknowledgement</Text>
          {p.customerSignatureUrl && (
            <View style={styles.sigBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={p.customerSignatureUrl} style={styles.sigImage} />
            </View>
          )}
        </View>

        <Text style={styles.footer}>DADA HOUSE — Air Conditioning, Heating, Plumbing & Remodeling · (844) 928-0875 · www.dada-house.com</Text>
      </Page>
    </Document>
  );
}

export async function renderSystemStartupReportPdf(props: SystemStartupReportProps): Promise<Buffer> {
  return renderToBuffer(<SystemStartupReportDocument {...props} />);
}
