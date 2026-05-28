import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/client/profile-form";
import PushSubscribeButton from "@/components/portal/push-subscribe-button";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
        <ProfileForm user={user} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Push Notifications</h3>
        <p className="text-sm text-gray-500 mb-4">Receive real-time updates when your technician is on the way, arrives, and completes your job.</p>
        <PushSubscribeButton />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Contact Info</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Email: {session.user.email}</p>
          {session.user.phone && <p>Phone: {session.user.phone}</p>}
        </div>
      </div>
    </div>
  );
}
