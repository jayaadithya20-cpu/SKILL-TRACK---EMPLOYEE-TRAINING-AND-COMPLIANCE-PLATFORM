import { categoryLabel } from '../format.js';

const STATUS_TEXT = {
  active: 'Valid', expiring: 'Renew soon', expired: 'Expired',
  completed: 'Completed', 'in-progress': 'In progress', 'not-started': 'Not started',
  overdue: 'Overdue', passed: 'Passed', failed: 'Not passed',
};

export function Status({ value }) {
  return <span className={`status status-${value}`}>{STATUS_TEXT[value] || value}</span>;
}

export function Category({ value }) {
  return <span className={`cat cat-${value}`}>{categoryLabel(value)}</span>;
}

export function Progress({ value, label }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100" aria-label={label || 'Progress'}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}

export function Alert({ children, tone = 'bad' }) {
  return children ? <div className={`alert alert-${tone}`} role="alert">{children}</div> : null;
}
