import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import StatusBadge from './StatusBadge';
import {
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
} from '../api/client';

const STATUS_OPTIONS = ['confirmed', 'pending', 'rescheduled', 'cancelled'];

function formatDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="w-40 text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value || '—'}</span>
    </div>
  );
}

export default function AppointmentModal({ appointment, onClose }) {
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState(appointment.status);
  const [reschedDate, setReschedDate] = useState(appointment.appointment_date || '');
  const [reschedTime, setReschedTime] = useState(
    appointment.appointment_time ? appointment.appointment_time.slice(0, 5) : ''
  );
  const [showReschedForm, setShowReschedForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const statusMut = useMutation({
    mutationFn: () => updateAppointmentStatus(appointment.id, newStatus),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const reschedMut = useMutation({
    mutationFn: () => rescheduleAppointment(appointment.id, reschedDate, reschedTime),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelAppointment(appointment.id),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const error = statusMut.error?.message || reschedMut.error?.message || cancelMut.error?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{appointment.client_name}</h2>
            <p className="text-sm text-gray-500">{appointment.service_type}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={appointment.status} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* Details */}
        <div className="p-5">
          <Row label="Phone" value={appointment.phone} />
          <Row label="Email" value={appointment.email} />
          <Row label="Address" value={appointment.address} />
          <Row label="Service" value={appointment.service_type} />
          <Row label="Problem" value={appointment.problem_description} />
          <Row label="Date" value={formatDate(appointment.appointment_date)} />
          <Row label="Time" value={formatTime(appointment.appointment_time)} />
          <Row label="Diagnostic Fee" value="$35 (deductible if work approved)" />
          <Row
            label="Calendar"
            value={appointment.calendar_event_id ? '✅ Synced with Google Calendar' : '⚠️ Not synced'}
          />
          <Row label="Created" value={appointment.created_at ? new Date(appointment.created_at).toLocaleString() : '—'} />
        </div>

        {/* Actions */}
        <div className="p-5 border-t space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

          {/* Change status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Change Status</label>
            <div className="flex gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => statusMut.mutate()}
                disabled={statusMut.isPending || newStatus === appointment.status}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {statusMut.isPending ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>

          {/* Reschedule */}
          <div>
            <button
              onClick={() => setShowReschedForm((v) => !v)}
              className="text-sm text-brand-600 hover:underline font-medium"
            >
              {showReschedForm ? 'Hide reschedule form' : 'Reschedule appointment'}
            </button>
            {showReschedForm && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={reschedDate}
                    onChange={(e) => setReschedDate(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="time"
                    value={reschedTime}
                    min="09:00"
                    max="19:00"
                    onChange={(e) => setReschedTime(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  onClick={() => reschedMut.mutate()}
                  disabled={reschedMut.isPending || !reschedDate || !reschedTime}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {reschedMut.isPending ? 'Rescheduling…' : 'Confirm Reschedule'}
                </button>
              </div>
            )}
          </div>

          {/* Cancel */}
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="text-sm text-red-600 hover:underline font-medium"
            >
              Cancel appointment
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg">
              <span className="text-sm text-red-700">Are you sure? This will delete the calendar event.</span>
              <button
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMut.isPending ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="px-3 py-1 text-gray-600 text-sm hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
