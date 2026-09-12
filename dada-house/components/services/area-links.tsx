import Link from "next/link";

// Cross-links each service page to its counterpart in the other service area — helps both
// visitors and Google understand DADA HOUSE serves two distinct metros, not just one.
export default function ServiceAreaLinks({
  serviceSlug,
  current,
}: {
  serviceSlug: string;
  current: "houston-tx" | "jacksonville-nc";
}) {
  const other =
    current === "houston-tx"
      ? { href: `/services/${serviceSlug}/jacksonville-nc`, label: "Jacksonville, NC" }
      : { href: `/services/${serviceSlug}`, label: "Houston, TX" };

  return (
    <p className="text-center text-sm text-slate-500 py-6 bg-white">
      Also serving{" "}
      <Link href={other.href} className="text-[#1B3FA8] font-semibold hover:underline">
        {other.label}
      </Link>
    </p>
  );
}
