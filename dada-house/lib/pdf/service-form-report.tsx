import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

type FormField = { id: string; label: string; type: string };
type Submission = { values: Record<string, unknown>; submittedAt: string | Date };

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
  fieldRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#f3f4f6", paddingVertical: 4 },
  fieldLabel: { width: 220, color: "#374151" },
  fieldValue: { flex: 1, fontWeight: 700, color: "#111827" },
  commentsBox: { backgroundColor: "#f9fafb", borderRadius: 4, padding: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  commentsText: { color: "#111827", lineHeight: 1.4 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  photoBox: { width: 140 },
  photo: { width: 140, height: 105, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 7, color: "#6b7280", marginTop: 2, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
});

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export type ServiceFormReportProps = {
  reportNumber: string;
  formName: string;
  submittedAt: string | Date;
  technicianName: string | null;
  technicianComments?: string;
  customer: { name: string; phone: string; email: string | null; address: string; city: string; zipCode: string };
  fields: FormField[];
  submission: Submission;
};

export function ServiceFormReportDocument({ reportNumber, formName, submittedAt, technicianName, technicianComments, customer, fields, submission }: ServiceFormReportProps) {
  const values = submission.values ?? {};

  const dataRows = fields.filter((f) => f.type !== "media" && f.label.trim());
  const allPhotos: { url: string; caption: string }[] = [];

  for (const f of fields) {
    if (f.type === "media") {
      const urls = (values[f.id] as string[]) ?? [];
      for (const url of urls) if (isImageUrl(url)) allPhotos.push({ url, caption: f.label });
    }
    const extra = (values[`${f.id}__media`] as string[]) ?? [];
    for (const url of extra) if (isImageUrl(url)) allPhotos.push({ url, caption: f.label });
  }

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
            <Text style={styles.title}>{formName}</Text>
            <Text style={styles.subtitle}>Report {reportNumber}</Text>
            <Text style={styles.subtitle}>{new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Service Details</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer</Text><Text style={styles.infoValue}>{customer.name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{customer.phone}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{customer.address}, {customer.city} {customer.zipCode}</Text></View>
          {technicianName && <View style={styles.infoRow}><Text style={styles.infoLabel}>Technician</Text><Text style={styles.infoValue}>{technicianName}</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Details</Text>
          {dataRows.map((f) => {
            const raw = values[f.id];
            const display = Array.isArray(raw) ? raw.join(", ") : typeof raw === "boolean" ? (raw ? "Yes" : "No") : raw != null && raw !== "" ? String(raw) : "—";
            return (
              <View key={f.id} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>{display}</Text>
              </View>
            );
          })}
        </View>

        {technicianComments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technician Notes — Problems Observed & Recommendations</Text>
            <View style={styles.commentsBox}>
              <Text style={styles.commentsText}>{technicianComments}</Text>
            </View>
          </View>
        )}

        {allPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photosGrid}>
              {allPhotos.map((p, i) => (
                <View key={i} style={styles.photoBox}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={p.url} style={styles.photo} />
                  <Text style={styles.photoCaption}>{p.caption}</Text>
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

export async function renderServiceFormReportPdf(props: ServiceFormReportProps): Promise<Buffer> {
  return renderToBuffer(<ServiceFormReportDocument {...props} />);
}
