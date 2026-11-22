import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { fmtDate, fmtUsd, propertyLine, type PaymentReceipt } from "@/lib/maintenance-contract";

const C = { blue: "#1B3FA8", orange: "#F7921A", gray: "#6b7280", line: "#e5e7eb" };
const st = StyleSheet.create({
  page: { padding: 34, paddingBottom: 54, fontSize: 9.5, fontFamily: "Helvetica", color: "#111827", lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: 2, borderBottomColor: C.blue, paddingBottom: 10, marginBottom: 12 },
  logo: { width: 100, height: 46, objectFit: "contain", marginBottom: 4 },
  title: { fontSize: 15, fontWeight: 700, color: C.blue, textAlign: "right" },
  sub: { fontSize: 8.5, color: C.gray, textAlign: "right", marginTop: 1 },
  h: { fontSize: 11, fontWeight: 700, color: C.blue, marginTop: 10, marginBottom: 4 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8, marginBottom: 8 },
  row: { flexDirection: "row", marginBottom: 2 },
  k: { width: 120, color: C.gray },
  v: { flex: 1 },
  p: { marginBottom: 5 },
  li: { flexDirection: "row", marginBottom: 3, paddingLeft: 6 },
  bullet: { width: 10 },
  sigBox: { borderWidth: 1.5, borderColor: C.blue, borderRadius: 4, padding: 10, marginTop: 12 },
  sig: { height: 60, objectFit: "contain", marginVertical: 4 },
  small: { fontSize: 8, color: C.gray },
  total: { flexDirection: "row", justifyContent: "space-between", borderTop: 1, borderTopColor: C.line, paddingTop: 5, marginTop: 4, fontWeight: 700 },
  footer: { position: "absolute", bottom: 20, left: 34, right: 34, fontSize: 7.5, color: "#9ca3af", textAlign: "center", borderTop: 1, borderTopColor: C.line, paddingTop: 5 },
});

type Run = { text: string; bold: boolean };
type Block = { kind: "h" | "p" | "li"; runs: Run[] };

const decode = (s: string) => s
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–");

/** Splits inline HTML into plain/bold runs; every other tag is dropped. */
function runs(inner: string): Run[] {
  const out: Run[] = [];
  const re = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let last = 0, m: RegExpExecArray | null;
  const push = (t: string, bold: boolean) => { const text = decode(t.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t\r\n]+/g, " "); if (text.trim()) out.push({ text, bold }); };
  while ((m = re.exec(inner))) { push(inner.slice(last, m.index), false); push(m[2], true); last = m.index + m[0].length; }
  push(inner.slice(last), false);
  return out;
}

/** The plan's contract template is simple HTML (h2/h3/p/li/table rows) — turned into PDF blocks in reading order. */
export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const re = /<(h[1-4]|p|li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const inner = tag === "tr" ? m[2].replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, "  |  ") : m[2];
    const r = runs(inner);
    if (r.length) blocks.push({ kind: tag.startsWith("h") ? "h" : tag === "li" ? "li" : "p", runs: r });
  }
  return blocks;
}

export type ContractPdfProps = {
  contractNumber: string;
  membershipNumber: string | null;
  planName: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  properties: { id: string; nickname: string | null; address: string; apt: string | null; city: string; state: string; zipCode: string; systemCount: number }[];
  numberOfSystems: number;
  billingInterval: string | null;
  autoRenew: boolean;
  planPrice: number | null;
  startDate: Date | null;
  renewalDate: Date | null;
  contractHtml: string; // already filled with this customer's facts
  signatureUrl: string;
  signedAt: Date;
  signerIp: string | null;
  statement: string;
  receipt: PaymentReceipt;
};

function Body({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        const text = b.runs.map((r, j) => <Text key={j} style={r.bold ? { fontWeight: 700 } : undefined}>{r.text}</Text>);
        if (b.kind === "h") return <Text key={i} style={st.h} minPresenceAhead={30}>{text}</Text>;
        if (b.kind === "li") return <View key={i} style={st.li} wrap={false}><Text style={st.bullet}>•</Text><Text style={{ flex: 1 }}>{text}</Text></View>;
        return <Text key={i} style={st.p}>{text}</Text>;
      })}
    </>
  );
}

function Header({ title, p }: { title: string; p: ContractPdfProps }) {
  return (
    <View style={st.header} fixed>
      <View>
        <Image src="https://www.dada-house.com/logo%20dada%20house.png" style={st.logo} />
        <Text style={st.small}>DADA HOUSE LLC · (844) 928-0875 · dada-house.com</Text>
      </View>
      <View>
        <Text style={st.title}>{title}</Text>
        <Text style={st.sub}>Contract {p.contractNumber}</Text>
        {p.membershipNumber && <Text style={st.sub}>Membership #{p.membershipNumber}</Text>}
      </View>
    </View>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <View style={st.row}><Text style={st.k}>{k}</Text><Text style={st.v}>{v}</Text></View>;

export function MaintenanceContractDocument(p: ContractPdfProps) {
  const blocks = htmlToBlocks(p.contractHtml);
  const billing = p.billingInterval === "monthly" ? "Monthly" : "Annual";
  const r = p.receipt;
  return (
    <Document title={`DADA HOUSE Maintenance Contract ${p.contractNumber}`}>
      <Page size="LETTER" style={st.page}>
        <Header title="HVAC MAINTENANCE PLAN AGREEMENT" p={p} />

        <View style={st.box}>
          <Row k="Customer" v={p.customerName} />
          {p.phone && <Row k="Phone" v={p.phone} />}
          {p.email && <Row k="Email" v={p.email} />}
          <Row k="Plan" v={`${p.planName} HVAC Maintenance Plan`} />
          <Row k="Systems covered" v={String(p.numberOfSystems)} />
          <Row k="Billing" v={`${billing}${p.planPrice != null ? ` — ${fmtUsd(p.planPrice)}${p.billingInterval === "monthly" ? "/month" : "/year"}` : ""}${p.autoRenew ? " (auto-renews)" : ""}`} />
          <Row k="Payment date" v={fmtDate(r.paidAt)} />
          <Row k="Start date" v={fmtDate(p.startDate)} />
          {p.renewalDate && <Row k="Next renewal" v={fmtDate(p.renewalDate)} />}
        </View>

        {p.properties.length > 0 && (
          <View style={st.box}>
            <Text style={{ fontWeight: 700, marginBottom: 3 }}>Covered properties</Text>
            {p.properties.map((pr) => (
              <Text key={pr.id}>• {pr.nickname ? `${pr.nickname}: ` : ""}{propertyLine(pr)} — {pr.systemCount} system{pr.systemCount === 1 ? "" : "s"}</Text>
            ))}
          </View>
        )}

        <Body blocks={blocks} />

        <View style={st.sigBox} wrap={false}>
          <Text style={{ fontWeight: 700, color: C.blue }}>CUSTOMER SIGNATURE</Text>
          <Text style={st.small}>{p.statement}</Text>
          <Image src={p.signatureUrl} style={st.sig} />
          <Text>{p.customerName} — signed electronically on {p.signedAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" })} ET{p.signerIp ? ` · IP ${p.signerIp}` : ""}</Text>
        </View>

        <Text style={st.footer} fixed render={({ pageNumber, totalPages }) => `DADA HOUSE · Contract ${p.contractNumber} · Page ${pageNumber} of ${totalPages}`} />
      </Page>

      <Page size="LETTER" style={st.page}>
        <Header title="PAYMENT RECEIPT" p={p} />
        <View style={st.box}>
          <Row k="Received from" v={p.customerName} />
          <Row k="Description" v={`${p.planName} HVAC Maintenance Plan — ${billing} (${p.numberOfSystems} system${p.numberOfSystems === 1 ? "" : "s"})`} />
          <Row k="Payment date" v={fmtDate(r.paidAt)} />
          {r.invoiceNumber && <Row k="Invoice number" v={r.invoiceNumber} />}
          <Row k="Payment method" v="Card — processed securely by Stripe" />
          {r.subtotal != null && r.total != null && r.subtotal !== r.total && <Row k="Subtotal" v={fmtUsd(r.subtotal)} />}
          {r.total != null && r.subtotal != null && r.subtotal !== r.total && <Row k="Total (incl. discounts/tax)" v={fmtUsd(r.total)} />}
          <View style={st.total}>
            <Text>Amount paid</Text>
            <Text>{r.amountPaid != null ? fmtUsd(r.amountPaid) : "See your Stripe receipt"}</Text>
          </View>
        </View>
        {r.receiptUrl && <Text style={st.small}>Online receipt: {r.receiptUrl}</Text>}
        <Text style={[st.small, { marginTop: 8 }]}>Thank you for choosing DADA HOUSE. Questions about your plan or this payment: (844) 928-0875 · customerservice@dada-house.com</Text>
        <Text style={st.footer} fixed render={({ pageNumber, totalPages }) => `DADA HOUSE · Contract ${p.contractNumber} · Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function renderMaintenanceContractPdf(p: ContractPdfProps) {
  return renderToBuffer(<MaintenanceContractDocument {...p} />);
}
