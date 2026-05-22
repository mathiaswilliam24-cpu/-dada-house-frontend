import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAppointments } from '../api/client';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentModal from '../components/AppointmentModal';

const STATUS_FILTERS = ['all', 'confirmed', 'pending', 'rescheduled', 'cancelled'];

export default function Appointments() {
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['appointments', { status, dateFrom, dateTo }],
    queryFn: () => fetchAppointments({ status, dateFrom, dateTo }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.length ?? 0} appointments</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  status === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-sm">Error: {error.message}</p>
      ) : (
        <AppointmentTable appointments={data} onSelect={setSelected} />
      )}

      {selected && (
        <AppointmentModal appointment={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
