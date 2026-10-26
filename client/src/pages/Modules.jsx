import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { Alert, Category, Empty, Progress, Status } from '../components/ui.jsx';
import { CATEGORIES, categoryLabel, relativeDue, daysUntil } from '../format.js';

const VIEWS = [
  ['all', 'All'], ['mine', 'My plan'], ['todo', 'To do'], ['done', 'Completed'],
];

export default function Modules() {
  const [modules, setModules] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('mine');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');

  const load = () => api.get('/modules').then((r) => setModules(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const enroll = async (id) => {
    try { await api.post(`/modules/${id}/enroll`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const shown = useMemo(() => (modules || []).filter((m) => {
    const st = m.enrollment?.status;
    if (view === 'mine' && !m.enrollment) return false;
    if (view === 'todo' && (!m.enrollment || st === 'completed')) return false;
    if (view === 'done' && st !== 'completed') return false;
    if (category && m.category !== category) return false;
    if (q && !`${m.title} ${m.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [modules, view, category, q]);

  return (
    <>
      <header className="page-head">
        <h1>Training modules</h1>
      </header>
      <Alert>{error}</Alert>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {VIEWS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
        <input type="search" placeholder="Search modules" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!modules ? <p className="muted">Loading modules…</p> : shown.length === 0 ? (
        <Empty title="No modules match">Try another filter, or switch to "All" to browse the full catalogue.</Empty>
      ) : (
        <div className="module-list">
          {shown.map((m) => {
            const e = m.enrollment;
            const overdue = e && e.status !== 'completed' && e.dueDate && daysUntil(e.dueDate) < 0;
            return (
              <article key={m._id} className={`module-row ${m.isMandatory ? 'mandatory' : ''}`}>
                <div className="module-main">
                  <div className="module-tags">
                    <Category value={m.category} />
                    {m.isMandatory && <span className="tag-req">Required</span>}
                    {m.certification && <Status value={m.certification.status} />}
                  </div>
                  <h3><Link to={`/modules/${m._id}`}>{m.title}</Link></h3>
                  <p className="muted">{m.description}</p>
                  <p className="meta">
                    {m.durationMinutes} min · {m.questionCount} questions · pass mark {m.passingScore}%
                    {m.certificationValidityMonths ? ` · certificate valid ${m.certificationValidityMonths} months` : ''}
                  </p>
                </div>
                <div className="module-side">
                  {e ? (
                    <>
                      <Status value={overdue ? 'overdue' : e.status} />
                      <Progress value={e.progress} label={`${m.title} progress`} />
                      <span className={overdue ? 'small text-bad' : 'small muted'}>
                        {e.status === 'completed' ? `${e.progress}% complete` : relativeDue(e.dueDate)}
                      </span>
                      <Link className="btn" to={`/modules/${m._id}`}>
                        {e.status === 'completed' ? 'Review' : e.status === 'in-progress' ? 'Continue' : 'Start'}
                      </Link>
                    </>
                  ) : (
                    <button className="btn btn-primary" onClick={() => enroll(m._id)}>Add to my plan</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
