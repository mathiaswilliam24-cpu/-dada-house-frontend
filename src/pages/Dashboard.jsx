import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchStats, fetchAppointments } from '../api/client';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentModal from '../components/AppointmentModal';
import { useState } from 'react';

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm border ${color}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-4xl font-bold mt-1">{value ?? '—'}</p>
    </div>
  );
}

export default function Dashboard() {
  const [selected, setSelected] = useState(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  });

  const { data: recent } = useQuery({
    queryKey: ['appointments', { limit: 10 }],
    queryFn: () => fetchAppointments(),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">DADA HOUSE appointment overview</p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <p className="text-gray-400">Loading stats…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats?.total} color="border-gray-200 bg-white" />
          <StatCard label="Today" value={stats?.today} color="border-blue-200 bg-blue-50" />
          <StatCard label="Confirmed" value={stats?.confirmed} color="border-green-200 bg-green-50" />
          <StatCard label="Pending" value={stats?.pending} color="border-yellow-200 bg-yellow-50" />
          <StatCard label="Cancelled" value={stats?.cancelled} color="border-red-200 bg-red-50" />
        </div>
      )}

      {/* Recent appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Appointments</h2>
          <Link to="/appointments" className="text-sm text-brand-600 hover:underline font-medium">
            View all →
          </Link>
        </div>
        <AppointmentTable
          appointments={(recent || []).slice(0, 10)}
          onSelect={setSelected}
        />
      </div>

      {selected && (
        <AppointmentModal appointment={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
