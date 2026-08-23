import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { InvoiceDownload } from "@/components/client/invoice-download";
import { PhotoGallery } from "@/components/client/photo-gallery";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Wrench,
  MessageSquare,
  CheckCircle2,
  Loader,
} from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LI = { rate: number; qty: number };

function computeTotal(raw: unknown, fallback: number): number {
  let items: LI[];
  let taxEnabled = true;
  let taxRate = 8.25;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      items = m.items as LI[];
      taxEnabled = m.taxEnabled !== false;
      taxRate = typeof m.taxRate === "number" ? m.taxRate : 8.25;
    } else {
      items = [{ rate: fallback, qty: 1 }];
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    items = raw as LI[];
  } else {
    items = [{ rate: fallback, qty: 1 }];
  }

  const subtotal = items.reduce((s, i) => s + i.rate * i.qty, 0);
  return subtotal + (taxEnabled ? subtotal * taxRate / 100 : 0);
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:     <Loader className="w-4 h-4 text-yellow-500" />,
  CONFIRMED:   <CheckCircle2 className="w-4 h-4 text-blue-500" />,
  IN_PROGRESS: <Wrench className="w-4 h-4 text-indigo-500" />,
  COMPLETED:   <CheckCircle2 className="w-4 h-4 text-green-600" />,
  CANCELLED:   <CheckCircle2 className="w-4 h-4 text-red-400" />,
};

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;

  const appt = await db.appointment.findUnique({
    where: { id },
    include: {
      invoice: {
        select: {
          id: true, amount: true, status: true, pdfUrl: true,
          notes: true, lineItems: true, createdAt: true,
          paidAt: true, paymentMethod: true,
        },
      },
    },
  });

  if (!appt) notFound();
  if (appt.userId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const statusClasses = getStatusColor(appt.status);
  const isCompleted = appt.status === "COMPLETED";

  const invoiceForClient = appt.invoice
    ? {
        ...appt.invoice,
        createdAt: appt.invoice.createdAt.toISOString(),
        paidAt: appt.invoice.paidAt?.toISOString() ?? null,
        total: computeTotal(appt.invoice.lineItems, appt.invoice.amount),
      }
    : null;

  return (
    <div className="max-w-2xl">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Hero card */}
      <div className={`rounded-2xl border p-5 mb-4 ${isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-mono mb-1">#{appt.appointmentNumber}</p>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {appt.service}
              {appt.subservice && (
                <span className="text-gray-500 font-normal text-base"> — {appt.subservice}</span>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${statusClasses}`}>
                {STATUS_ICON[appt.status]}
                {appt.status.replace("_", " ")}
              </span>
              {appt.preferredDate && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(appt.preferredDate.toISOString())}
                  {appt.preferredTime && (
                    <span className="flex items-center gap-1 ml-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {appt.preferredTime}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {appt.address}, {appt.city}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">

        {/* Work summary (admin notes — visible when filled) */}
        {appt.notes && (
          <div className={`rounded-xl border p-5 ${isCompleted ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className={`w-4 h-4 ${isCompleted ? "text-green-600" : "text-[#1B3FA8]"}`} />
              <h3 className="font-semibold text-gray-900">Work Summary</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{appt.notes}</p>
          </div>
        )}

        {/* Photos */}
        <PhotoGallery photos={appt.photos} />

        {/* Receipt / Invoice */}
        {invoiceForClient && <InvoiceDownload invoice={invoiceForClient} />}

        {/* Client's original request */}
        {appt.description && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Your Request</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{appt.description}</p>
          </div>
        )}

        {/* Appointment notes from team (distinct from work summary when both exist) */}
        {!appt.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              {appt.preferredDate && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700">{formatDate(appt.preferredDate.toISOString())}</span>
                  {appt.preferredTime && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" /> {appt.preferredTime}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-700">{appt.address}, {appt.city}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-3">
          <p className="text-xs text-gray-400">
            Booked on {formatDate(appt.createdAt.toISOString())}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Questions?{" "}
            <a href="tel:+13466499353" className="text-[#F7921A] hover:underline">
              Call us: +1 (346) 649-9353
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
