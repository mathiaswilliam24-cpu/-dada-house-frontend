import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_ADMIN_SECRET || ''}`,
  },
});

export const fetchStats = async () => {
  const { data } = await api.get('/admin/stats');
  return data.data;
};

export const fetchAppointments = async ({ status, dateFrom, dateTo } = {}) => {
  const params = {};
  if (status && status !== 'all') params.status = status;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  const { data } = await api.get('/admin/appointments', { params });
  return data.data;
};

export const fetchAppointment = async (id) => {
  const { data } = await api.get(`/admin/appointments/${id}`);
  return data.data;
};

export const updateAppointmentStatus = async (id, status) => {
  const { data } = await api.patch(`/admin/appointments/${id}/status`, { status });
  return data.data;
};

export const rescheduleAppointment = async (id, appointment_date, appointment_time) => {
  const { data } = await api.patch(`/admin/appointments/${id}/reschedule`, {
    appointment_date,
    appointment_time,
  });
  return data.data;
};

export const cancelAppointment = async (id) => {
  const { data } = await api.delete(`/admin/appointments/${id}`);
  return data.data;
};

// CRM
export const fetchCRMStats = async () => {
  const { data } = await api.get('/crm/stats');
  return data.data;
};

export const fetchClients = async ({ search, status } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const { data } = await api.get('/crm/clients', { params });
  return data.data;
};

export const fetchClient = async (id) => {
  const { data } = await api.get(`/crm/clients/${id}`);
  return data.data;
};

export const updateClientStatus = async (id, status) => {
  const { data } = await api.patch(`/crm/clients/${id}/status`, { status });
  return data.data;
};

export const addClientNote = async (id, note) => {
  const { data } = await api.post(`/crm/clients/${id}/notes`, { note });
  return data.data;
};
