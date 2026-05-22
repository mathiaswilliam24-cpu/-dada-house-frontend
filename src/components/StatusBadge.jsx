const styles = {
  confirmed:   'bg-green-100 text-green-800',
  pending:     'bg-yellow-100 text-yellow-800',
  cancelled:   'bg-red-100 text-red-800',
  rescheduled: 'bg-blue-100 text-blue-800',
};

export default function StatusBadge({ status }) {
  const cls = styles[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}
