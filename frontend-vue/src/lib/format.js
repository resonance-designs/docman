// Calendar fields are stored at UTC midnight; their displayed day must not shift
// with the viewer's timezone. Activity timestamps continue to use local time.
export function formatCalendarDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function formatDate(value) {
  if (!value) {
    return 'Not set';
  }
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export const VERSION_STATUS = {
  publishing: { label: 'Publication incomplete', color: 'warning', icon: 'mdi-refresh' },
  pending_approval: { label: 'Awaiting approval', color: 'warning', icon: 'mdi-timer-sand' },
  approved: { label: 'Published', color: 'success', icon: 'mdi-check-decagram' },
  superseded: { label: 'Superseded', color: 'grey', icon: 'mdi-history' },
  rejected: { label: 'Rejected', color: 'error', icon: 'mdi-close-octagon-outline' },
  withdrawn: { label: 'Withdrawn', color: 'grey', icon: 'mdi-undo-variant' },
};

export function errorMessage(error, fallback = 'Something went wrong.') {
  return error?.response?.data?.message || error?.message || fallback;
}
