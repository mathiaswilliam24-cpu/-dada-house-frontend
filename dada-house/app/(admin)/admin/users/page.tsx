import { redirect } from "next/navigation";
import { auth } from "@/auth";
import UsersClient from "./users-client";

export const dynamic = "force-dynamic";

/**
 * User/role management is kept exclusive to SUPER_ADMIN even though the rest of
 * /admin is open to Admin/Manager/CSR/Dispatcher — this is the one place that
 * can grant/escalate roles, so it stays with the account owner only.
 */
export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/admin");
  return <UsersClient />;
}
