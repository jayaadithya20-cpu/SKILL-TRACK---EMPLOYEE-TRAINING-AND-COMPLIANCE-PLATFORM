import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Stat } from '../components/ui.jsx';
import { fmtDate, daysUntil } from '../format.js';

const C = { pine: '#1E3B33', sage: '#7FA394', brass: '#B8862B', ok: '#2F7D5B', warn: '#C2861C', bad: '#B03A2E', grid: '#E3E7E2' };

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/analytics/overview').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const runReminders = async () => {
    try {
      const r = await api.post('/certifications/run-reminders');
      setNotice(`Sent ${r.data.certReminders} renewal and ${r.data.overdueReminders} overdue reminder(s).`);
    } catch (e) { setError(errMsg(e)); }
  };

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="muted">Loading analytics…</p>;
  const { totals, byDepartment, byModule, certBreakdown, trend, overdueList } = data;
  const certData = [
    { name: 'Valid', value: certBreakdown.active, color: C.ok },
    { name: 'Renew soon', value: certBreakdown.expiring, color: C.warn },
    { name: 'Expired', value: certBreakdown.expired, color: C.bad },
  ];

  return (
    <>
      <header className="page-head row">
        <h1>{user.role === 'manager' ? `${user.department} analytics` : 'Organisation analytics'}</h1>
        {user.role === 'admin' && <button className="btn" onClick={runReminders}>Send reminders now</button>}
      </header>
      <Alert tone="ok">{notice}</Alert>

      <section className="stats">
        <Stat label="Mandatory compliance" value={`${totals.complianceRate}%`} hint={`${totals.employees} employees`} tone={totals.complianceRate < 80 ? 'warn' : undefined} />
        <Stat label="Overall completion" value={`${totals.completionRate}%`} hint={`${totals.enrollments} enrolments`} />
        <Stat label="Average score" value={totals.averageScore} hint={`${totals.passRate}% pass rate`} />
        <Stat label="Overdue" value={totals.overdue} hint="past their deadline" tone={totals.overdue ? 'bad' : undefined} />
      </section>

      <div className="grid-2">
        <section className="panel">
          <h3>Completion by department</h3>
          {byDepartment.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDepartment} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid horizontal={false} stroke={C.grid} />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="department" width={90} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="completionRate" name="Completion" radius={[0, 3, 3, 0]}>
                  {byDepartment.map((d) => <Cell key={d.department} fill={d.completionRate < 60 ? C.warn : C.pine} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty title="No enrolments yet" />}
        </section>

        <section className="panel">
          <h3>Certification status</h3>
          {certData.some((d) => d.value) ? (
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={certData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={2}>
                    {certData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="No certificates issued yet" />}
        </section>
      </div>

      <section className="panel">
        <h3>Activity over the last six months</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ right: 16 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="completions" name="Modules completed" stroke={C.pine} strokeWidth={2.5} />
            <Line type="monotone" dataKey="assessments" name="Assessments taken" stroke={C.brass} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="panel flush">
        <h3 className="pad">Module performance</h3>
        <table className="table">
          <thead><tr><th>Module</th><th className="num">Enrolled</th><th className="num">Completion</th><th className="num">Avg score</th><th className="num">Pass rate</th><th className="num">Attempts</th></tr></thead>
          <tbody>
            {byModule.map((m) => (
              <tr key={m.moduleId}>
                <td>{m.title}</td>
                <td className="num">{m.enrolled}</td>
                <td className="num">{m.completionRate}%</td>
                <td className="num">{m.averageScore || '—'}</td>
                <td className={`num ${m.attempts && m.passRate < 70 ? 'text-bad' : ''}`}>{m.attempts ? `${m.passRate}%` : '—'}</td>
                <td className="num">{m.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel flush">
        <h3 className="pad">Overdue training</h3>
        {overdueList.length ? (
          <table className="table">
            <thead><tr><th>Employee</th><th>Department</th><th>Module</th><th>Was due</th><th className="num">Progress</th></tr></thead>
            <tbody>
              {overdueList.map((o) => (
                <tr key={o._id}>
                  <td>{o.employee}</td><td>{o.department}</td><td>{o.module}</td>
                  <td className="text-bad">{fmtDate(o.dueDate)} ({-daysUntil(o.dueDate)}d)</td>
                  <td className="num">{o.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="pad muted">No overdue training. Everyone is on schedule.</p>}
      </section>
    </>
  );
}
