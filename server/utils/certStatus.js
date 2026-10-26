const DAY = 24 * 60 * 60 * 1000;

export const windowDays = () => Number(process.env.REMINDER_WINDOW_DAYS || 30);

// active | expiring | expired
export function certStatus(expiresAt, now = new Date()) {
  if (!expiresAt) return 'active';
  const exp = new Date(expiresAt);
  if (exp < now) return 'expired';
  if (exp - now <= windowDays() * DAY) return 'expiring';
  return 'active';
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export { DAY };
