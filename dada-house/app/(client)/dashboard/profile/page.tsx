import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/client/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, name: true, email: true, phone: true },
  });

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Update your personal information
        </p>
      </div>
      {user && <ProfileForm user={user} />}
    </div>
  );
}
