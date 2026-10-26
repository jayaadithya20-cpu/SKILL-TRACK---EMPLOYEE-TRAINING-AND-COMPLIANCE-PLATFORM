import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Stat, Status } from '../components/ui.jsx';
import { fmtDate, relativeDue, daysUntil } from '../format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics/me').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="muted">Loading your overview…</p>;
  const { stats, upcoming, renewals, recentResults } = data;
  const compliant = stats.complianceRate === 100 && stats.expiredCerts === 0;

  return (
    <>
      <header className="page-head">
        <h1>Good to see you, {user.name.split(' ')[0]}</h1>
      </header>

      <section className={`compliance-banner ${compliant ? 'ok' : 'attention'}`}>
        <div className="meter" style={{ '--v': stats.complianceRate }}>
          <span>{stats.complianceRate}%</span>
        </div>
        <div>
          <h2>{compliant ? 'You are fully compliant' : 'Your mandatory training needs attention'}</h2>
          <p>
            {stats.overdue > 0 && `${stats.overdue} overdue. `}
            {stats.expiredCerts > 0 && `${stats.expiredCerts} certificate(s) expired. `}
            {stats.expiringCerts > 0 && `${stats.expiringCerts} certificate(s) due for renewal. `}
            {compliant && 'All mandatory modules are complete and certificates are valid.'}
          </p>
        </div>
        {!compliant && <Link className="btn btn-primary" to="/modules">Go to my modules</Link>}
      </section>

      <section className="stats">
        <Stat label="Assigned modules" value={stats.assigned} hint={`${stats.inProgress} in progress`} />
        <Stat label="Completed" value={stats.completed} hint={`${stats.completionRate}% of assigned`} />
        <Stat label="Average score" value={stats.averageScore ?? '—'} hint="across all attempts" />
        <Stat label="Valid certificates" value={stats.activeCerts} hint={stats.expiringCerts ? `${stats.expiringCerts} renew soon` : 'none expiring'} tone={stats.expiringCerts ? 'warn' : undefined} />
      </section>

      <div className="grid-2">
        <section className="panel">
          <h3>Coming up</h3>
          {upcoming.length ? (
            <ul className="list">
              {upcoming.map((e) => (
                <li key={e._id}>
                  <Link to={`/modules/${e.module._id}`}>{e.module.title}</Link>
                  <span className={daysUntil(e.dueDate) < 0 ? 'text-bad' : 'muted'}>{relativeDue(e.dueDate)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty title="No deadlines">Nothing is due. Browse modules to keep building skills.</Empty>}
        </section>

        <section className="panel">
          <h3>Renewals</h3>
          {renewals.length ? (
            <ul className="list">
              {renewals.map((c) => (
                <li key={c._id}>
                  <Link to={`/modules/${c.module._id}`}>{c.module.title}</Link>
                  <span><Status value={c.status} /> {fmtDate(c.expiresAt)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty title="All certificates are current">You'll be reminded 30 days before any expiry.</Empty>}
        </section>
      </div>

      <section className="panel">
        <h3>Recent assessments</h3>
        {recentResults.length ? (
          <table className="table">
            <thead><tr><th>Module</th><th>Date</th><th>Attempt</th><th className="num">Score</th><th>Result</th></tr></thead>
            <tbody>
              {recentResults.map((r) => (
                <tr key={r._id}>
                  <td>{r.module.title}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>#{r.attemptNumber}</td>
                  <td className="num">{r.score}%</td>
                  <td><Status value={r.passed ? 'passed' : 'failed'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty title="No assessments yet">Finish a module's reading to unlock its assessment.</Empty>}
      </section>
    </>
  );
}
