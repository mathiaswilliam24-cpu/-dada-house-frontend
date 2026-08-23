import { db } from "@/lib/db";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { TeamAccountsSection } from "@/components/admin/team-accounts-section";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await db.setting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const teamUsers = await db.user.findMany({
    where: { role: { in: ["ADMIN", "TECHNICIAN", "DISPATCHER"] } },
    select: { id: true, name: true, email: true, phone: true, role: true },
    orderBy: { role: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage business settings and team accounts</p>
      </div>
      <AdminSettingsForm settings={settingsMap} />
      <TeamAccountsSection users={teamUsers} />
    </div>
  );
}
