export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export const relativeDue = (d) => {
  if (!d) return 'No deadline';
  const n = daysUntil(d);
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} overdue`;
  if (n === 0) return 'Due today';
  return `Due in ${n} day${n === 1 ? '' : 's'}`;
};

export const CATEGORIES = ['compliance', 'technical', 'safety', 'soft-skills', 'leadership'];
export const categoryLabel = (c) => ({ 'soft-skills': 'Soft skills' }[c] || c.charAt(0).toUpperCase() + c.slice(1));
