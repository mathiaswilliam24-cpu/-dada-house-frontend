import { db } from "@/lib/db";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await db.setting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Manage business settings
        </p>
      </div>
      <AdminSettingsForm settings={settingsMap} />
    </div>
  );
}
