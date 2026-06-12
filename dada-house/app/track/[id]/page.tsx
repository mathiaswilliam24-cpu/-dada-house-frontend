import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import TrackingView from "@/components/track/tracking-view";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      appointmentNumber: true,
      service: true,
      address: true,
      city: true,
      techStatus: true,
      technicianId: true,
      technician: { select: { name: true } },
    },
  });

  if (!appointment) notFound();

  let location = null;
  if (appointment.techStatus === "EN_ROUTE" && appointment.technicianId) {
    location = await db.technicianLocation.findFirst({
      where: { userId: appointment.technicianId },
      orderBy: { timestamp: "desc" },
    });
  }

  return (
    <TrackingView
      appointmentId={appointment.id}
      appointmentNumber={appointment.appointmentNumber}
      service={appointment.service}
      address={`${appointment.address}, ${appointment.city}`}
      technicianName={appointment.technician?.name ?? null}
      initialStatus={appointment.techStatus}
      initialLocation={location ? { lat: location.lat, lng: location.lng, timestamp: location.timestamp.toISOString() } : null}
    />
  );
}
