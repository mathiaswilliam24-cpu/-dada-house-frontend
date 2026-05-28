import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Users, Mail, Phone, Calendar, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const page = parseInt(pageParam ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { role: "CLIENT" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} registered client{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-sm text-[#F7921A] hover:underline font-medium"
        >
          Manage all roles →
        </Link>
      </div>

      {/* Search */}
      <form className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or phone…"
          className="flex-1 text-sm focus:outline-none"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Appts</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white">
                          {(user.name ?? user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name ?? "(No name)"}</p>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" /> {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {user.phone ? (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" /> {user.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {user._count.appointments}
                    </span>
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      appt{user._count.appointments !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" /> {formatDate(user.createdAt.toISOString())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/customers/${user.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B3FA8] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No customers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1.5">
              {page > 1 && (
                <a href={`?page=${page - 1}${q ? `&q=${q}` : ""}`}
                  className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">Previous</a>
              )}
              {page < totalPages && (
                <a href={`?page=${page + 1}${q ? `&q=${q}` : ""}`}
                  className="px-3 py-1.5 text-xs bg-[#1B3FA8] text-white rounded-lg hover:bg-[#1B3FA8]/90">Next</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
