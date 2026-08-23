import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { formatDate, getStatusColor, getTechStatusColor } from "@/lib/utils";
import { TECH_STATUS_LABEL } from "@/lib/tech-status";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Phone, MapPin, Calendar, Wrench, MessageSquare, CheckCircle2, Loader } from "lucide-react";
import { Suspense } from "react";
import LiveTrackingMap from "@/components/portal/live-tracking-map";
import { PhotoGallery } from "@/components/client/photo-gallery";
import { InvoiceDownload } from "@/components/client/invoice-download";

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

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      invoice: {
        select: {
          id: true, amount: true, status: true, pdfUrl: true,
          notes: true, lineItems: true, createdAt: true,
          paidAt: true, paymentMethod: true,
        },
      },
      notifications: { orderBy: { sentAt: "desc" }, take: 5 },
      technician: { select: { name: true, image: true, phone: true } },
    },
  });

  if (!appointment || (appointment.userId !== session.user.id && session.user.role !== "ADMIN")) {
    notFound();
  }

  const isCompleted = appointment.status === "COMPLETED";
  const isTracking = appointment.techStatus === "EN_ROUTE";

  const invoiceForClient = appointment.invoice
    ? {
        ...appointment.invoice,
        createdAt: appointment.invoice.createdAt.toISOString(),
        paidAt: appointment.invoice.paidAt?.toISOString() ?? null,
        total: computeTotal(appointment.invoice.lineItems, appointment.invoice.amount),
      }
    : null;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Back */}
      <Link href="/portal/history" className="text-sm text-gray-500 hover:text-gray-700 block">
        ← Service History
      </Link>

      {/* Hero card */}
      <div className={`rounded-2xl border p-5 ${isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-mono mb-0.5">#{appointment.appointmentNumber}</p>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {appointment.service}
              {appointment.subservice && (
                <span className="text-gray-500 font-normal text-base"> — {appointment.subservice}</span>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(appointment.status)}`}>
                {STATUS_ICON[appointment.status]}
                {appointment.status.replace("_", " ")}
              </span>
              {appointment.preferredDate && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(appointment.preferredDate.toISOString())}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                {appointment.address}, {appointment.city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live tracking */}
      {isTracking && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="font-semibold text-blue-900">Technician On My Way</p>
            </div>
            {appointment.technician && (
              <p className="text-sm text-blue-700 mt-0.5">
                {appointment.technician.name} · {TECH_STATUS_LABEL[appointment.techStatus ?? ""] ?? appointment.techStatus?.replace("_", " ")}
              </p>
            )}
          </div>
          <Suspense fallback={<div className="h-48 flex items-center justify-center text-gray-400">Loading map…</div>}>
            <LiveTrackingMap appointmentId={id} customerAddress={`${appointment.address}, ${appointment.city}`} />
          </Suspense>
        </div>
      )}

      {/* Technician info */}
      {appointment.technician && appointment.techStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Your Technician</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold text-lg">
              {appointment.technician.name?.[0] ?? "T"}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{appointment.technician.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTechStatusColor(appointment.techStatus)}`}>
                {TECH_STATUS_LABEL[appointment.techStatus] ?? appointment.techStatus.replace("_", " ")}
              </span>
            </div>
            {appointment.technician.phone && (
              <a href={`tel:${appointment.technician.phone}`} className={buttonVariants({ variant: "outline" })}>
                <Phone size={16} className="mr-1.5" />
                Call
              </a>
            )}
          </div>
        </div>
      )}

      {/* Work Summary (admin notes) */}
      {appointment.notes && (
        <div className={`rounded-xl border p-5 ${isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className={`w-4 h-4 ${isCompleted ? "text-green-600" : "text-[#1B3FA8]"}`} />
            <h3 className="font-semibold text-gray-900">Work Summary</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{appointment.notes}</p>
        </div>
      )}

      {/* Photos */}
      <PhotoGallery photos={appointment.photos} />

      {/* Receipt */}
      {invoiceForClient && <InvoiceDownload invoice={invoiceForClient} />}

      {/* Client description */}
      {appointment.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Your Request</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{appointment.description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-3">
        <p className="text-xs text-gray-400">
          Booked on {formatDate(appointment.createdAt.toISOString())}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Questions?{" "}
          <a href="tel:+13466499353" className="text-[#F7921A] hover:underline">
            Call us: +1 (346) 649-9353
          </a>
        </p>
      </div>
    </div>
  );
}
