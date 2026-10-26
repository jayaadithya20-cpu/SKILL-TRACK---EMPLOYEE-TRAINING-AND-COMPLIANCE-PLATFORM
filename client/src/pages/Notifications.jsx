import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { Alert, Empty } from '../components/ui.jsx';
import { fmtDate } from '../format.js';

const TYPE_LABEL = {
  assignment: 'Assigned', renewal: 'Renewal', expired: 'Expired',
  overdue: 'Overdue', certificate: 'Certificate', general: 'Notice',
};

export default function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/notifications').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.patch('/notifications/read-all'); load(); };
  const markOne = (id) => api.patch(`/notifications/${id}/read`).then(load);

  return (
    <>
      <header className="page-head row">
        <h1>Reminders</h1>
        {data?.unread > 0 && <button className="btn" onClick={markAll}>Mark all as read</button>}
      </header>
      <Alert>{error}</Alert>
      {!data ? <p className="muted">Loading…</p> : data.items.length === 0 ? (
        <Empty title="No reminders">Assignments, renewal notices and overdue alerts will appear here.</Empty>
      ) : (
        <ul className="notes">
          {data.items.map((n) => (
            <li key={n._id} className={`note note-${n.type} ${n.read ? '' : 'unread'}`}>
              <span className="note-type">{TYPE_LABEL[n.type]}</span>
              <div className="note-body">
                <p>{n.message}</p>
                <span className="small muted">{fmtDate(n.createdAt)}</span>
              </div>
              <div className="actions">
                {n.link && <Link className="btn btn-sm" to={n.link} onClick={() => !n.read && markOne(n._id)}>Open</Link>}
                {!n.read && <button className="btn btn-sm" onClick={() => markOne(n._id)}>Mark read</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
