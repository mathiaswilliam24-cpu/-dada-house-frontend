import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient, updateClientStatus, addClientNote } from '../api/client';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  vip: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const APPT_STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-blue-100 text-blue-700',
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => fetchClient(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateClientStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['client', id]),
  });

  const noteMutation = useMutation({
    mutationFn: (text) => addClientNote(id, text),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries(['client', id]);
    },
  });

  if (isLoading) return <p className="text-gray-400 p-8">Loading…</p>;
  if (!client) return <p className="text-gray-400 p-8">Client not found.</p>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          <p className="text-gray-500 text-sm">{client.phone} · {client.email}</p>
        </div>
        <select
          value={client.status}
          onChange={e => statusMutation.mutate(e.target.value)}
          className={`text-sm px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[client.status] || STATUS_COLORS.active}`}
        >
          <option value="active">Active</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 border bg-white shadow-sm">
          <p className="text-xs text-gray-500">Total Appointments</p>
          <p className="text-3xl font-bold text-blue-600">{client.total_appointments}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white shadow-sm">
          <p className="text-xs text-gray-500">Language</p>
          <p className="text-2xl font-bold uppercase">{client.language}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white shadow-sm">
          <p className="text-xs text-gray-500">First Seen</p>
          <p className="text-lg font-semibold">{client.first_seen}</p>
        </div>
        <div className="rounded-xl p-4 border bg-white shadow-sm">
          <p className="text-xs text-gray-500">Last Seen</p>
          <p className="text-lg font-semibold">{client.last_seen}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appointments */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Appointment History</h2>
          {client.appointments?.length === 0 ? (
            <p className="text-gray-400 text-sm">No appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {client.appointments.map(appt => (
                <div key={appt.id} className="border rounded-xl p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{appt.service_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APPT_STATUS_COLORS[appt.status] || 'bg-gray-100'}`}>
                      {appt.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{appt.appointment_date} at {appt.appointment_time}</p>
                  <p className="text-sm text-gray-400 mt-1">{appt.address}</p>
                  {appt.problem_description && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{appt.problem_description}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Notes & Follow-up</h2>

          {/* Add note */}
          <div className="mb-4">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this client..."
              rows={3}
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            <button
              onClick={() => note.trim() && noteMutation.mutate(note.trim())}
              disabled={!note.trim() || noteMutation.isPending}
              className="mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {noteMutation.isPending ? 'Saving…' : 'Add Note'}
            </button>
          </div>

          {/* Notes list */}
          {client.notes?.length === 0 ? (
            <p className="text-gray-400 text-sm">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {client.notes.map(n => (
                <div key={n.id} className="border rounded-xl p-4 bg-white shadow-sm">
                  {n.service_type && (
                    <p className="text-xs font-medium text-blue-600 mb-1">{n.service_type}</p>
                  )}
                  {n.problem_description && (
                    <p className="text-sm text-gray-600 italic mb-1">"{n.problem_description}"</p>
                  )}
                  {n.note && <p className="text-sm text-gray-800">{n.note}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
