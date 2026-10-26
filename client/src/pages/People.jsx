import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Status } from '../components/ui.jsx';
import { fmtDate } from '../format.js';

export default function People() {
  const { user } = useAuth();
  const [tab, setTab] = useState('certs');
  const [users, setUsers] = useState([]);
  const [certs, setCerts] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => {
    setCerts(null);
    api.get('/certifications', { params: status ? { status } : {} })
      .then((r) => setCerts(r.data.filter((c) => c.user && c.module)))
      .catch((e) => setError(errMsg(e)));
  }, [status]);

  const changeRole = async (id, role) => {
    try {
      const r = await api.patch(`/users/${id}`, { role });
      setUsers(users.map((u) => (u._id === id ? r.data : u)));
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <header className="page-head"><h1>People & certificates</h1></header>
      <Alert>{error}</Alert>
      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'certs'} className={tab === 'certs' ? 'active' : ''} onClick={() => setTab('certs')}>Certificate register</button>
          <button role="tab" aria-selected={tab === 'people'} className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>People ({users.length})</button>
        </div>
        {tab === 'certs' && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Certificate status">
            <option value="">All statuses</option>
            <option value="active">Valid</option>
            <option value="expiring">Renew soon</option>
            <option value="expired">Expired</option>
          </select>
        )}
      </div>

      {tab === 'certs' && (!certs ? <p className="muted">Loading…</p> : certs.length === 0 ? (
        <Empty title="No certificates match this filter" />
      ) : (
        <div className="panel flush">
          <table className="table">
            <thead><tr><th>Employee</th><th>Module</th><th>Issued</th><th>Expires</th><th className="num">Score</th><th>Status</th></tr></thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c._id}>
                  <td>{c.user.name}<div className="small muted">{c.user.department}</div></td>
                  <td>{c.module.title}</td>
                  <td>{fmtDate(c.issuedAt)}</td>
                  <td>{c.expiresAt ? fmtDate(c.expiresAt) : 'No expiry'}</td>
                  <td className="num">{c.score}%</td>
                  <td><Status value={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {tab === 'people' && (
        <div className="panel flush">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}<div className="small muted">{u.jobTitle}</div></td>
                  <td>{u.email}</td>
                  <td>{u.department}</td>
                  <td>
                    {user.role === 'admin' && u._id !== user._id ? (
                      <select value={u.role} onChange={(e) => changeRole(u._id, e.target.value)} aria-label={`Role for ${u.name}`}>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : <span className="cap">{u.role}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
