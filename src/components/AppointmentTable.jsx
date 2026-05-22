import { format, parseISO } from 'date-fns';
import StatusBadge from './StatusBadge';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = Number(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

export default function AppointmentTable({ appointments, onSelect }) {
  if (!appointments?.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        No appointments found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Client', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Calendar', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {appointments.map((apt) => (
            <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{apt.client_name}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{apt.phone}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{apt.service_type}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(apt.appointment_date)}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(apt.appointment_time)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={apt.status} />
              </td>
              <td className="px-4 py-3">
                {apt.calendar_event_id
                  ? <span className="text-green-600 text-xs font-medium">Synced</span>
                  : <span className="text-red-500 text-xs font-medium">Not synced</span>}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onSelect(apt)}
                  className="text-brand-600 hover:text-brand-800 font-medium text-xs"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
