import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Status } from '../components/ui.jsx';
import Certificate from '../components/Certificate.jsx';
import { fmtDate, daysUntil } from '../format.js';

export default function Certifications() {
  const { user } = useAuth();
  const [certs, setCerts] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get('/certifications/my').then((r) => setCerts(r.data.filter((c) => c.module))).catch((e) => setError(errMsg(e)));
  }, []);

  return (
    <>
      <header className="page-head"><h1>My certifications</h1></header>
      <Alert>{error}</Alert>
      {!certs ? <p className="muted">Loading…</p> : certs.length === 0 ? (
        <Empty title="No certificates yet">Pass a module assessment to earn your first certificate.
          <p><Link className="btn btn-primary" to="/modules">Browse modules</Link></p></Empty>
      ) : (
        <div className="panel flush">
          <table className="table">
            <thead><tr><th>Certificate</th><th>Issued</th><th>Expires</th><th>Status</th><th /></tr></thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c._id}>
                  <td><strong>{c.module.title}</strong><div className="small muted">{c.certificateId}{c.renewalCount ? ` · renewed ${c.renewalCount}×` : ''}</div></td>
                  <td>{fmtDate(c.issuedAt)}</td>
                  <td>
                    {c.expiresAt ? fmtDate(c.expiresAt) : 'No expiry'}
                    {c.expiresAt && c.status !== 'active' && (
                      <div className={`small ${c.status === 'expired' ? 'text-bad' : 'text-warn'}`}>
                        {c.status === 'expired' ? `${-daysUntil(c.expiresAt)} days ago` : `in ${daysUntil(c.expiresAt)} days`}
                      </div>
                    )}
                  </td>
                  <td><Status value={c.status} /></td>
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => setOpen(c)}>View</button>
                    {c.status !== 'active' && <Link className="btn btn-sm btn-primary" to={`/modules/${c.module._id}`}>Renew</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <Certificate cert={open} holder={user.name} onClose={() => setOpen(null)} />}
    </>
  );
}
