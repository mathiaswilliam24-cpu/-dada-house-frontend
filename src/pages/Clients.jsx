import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchClients, fetchCRMStats, updateClientStatus } from '../api/client';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  vip: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
};

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm border ${color}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-4xl font-bold mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: stats } = useQuery({ queryKey: ['crm-stats'], queryFn: fetchCRMStats, refetchInterval: 30000 });
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search, statusFilter],
    queryFn: () => fetchClients({ search, status: statusFilter }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateClientStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['clients']),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM — Clients</h1>
        <p className="text-gray-500 text-sm mt-1">Suivi et fidélisation des clients DADA HOUSE</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Clients" value={stats?.total} color="border-gray-200 bg-white" />
        <StatCard label="New This Month" value={stats?.newThisMonth} color="border-blue-200 bg-blue-50" />
        <StatCard label="Last Month" value={stats?.newLastMonth} color="border-indigo-200 bg-indigo-50" />
        <StatCard label="Loyal (2+ RDV)" value={stats?.loyal} color="border-green-200 bg-green-50" />
        <StatCard label="VIP (5+ RDV)" value={stats?.vip} color="border-yellow-200 bg-yellow-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-400">Loading clients…</p>
      ) : clients.length === 0 ? (
        <p className="text-gray-400">No clients found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Language</th>
                <th className="px-4 py-3 text-left">Appointments</th>
                <th className="px-4 py-3 text-left">First Seen</th>
                <th className="px-4 py-3 text-left">Last Seen</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {clients.map(client => (
                <tr
                  key={client.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.phone}</td>
                  <td className="px-4 py-3 uppercase text-gray-500">{client.language}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-blue-600">{client.total_appointments}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{client.first_seen}</td>
                  <td className="px-4 py-3 text-gray-500">{client.last_seen}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={client.status}
                      onChange={e => statusMutation.mutate({ id: client.id, status: e.target.value })}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${STATUS_COLORS[client.status] || STATUS_COLORS.active}`}
                    >
                      <option value="active">Active</option>
                      <option value="vip">VIP</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
