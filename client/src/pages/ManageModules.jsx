import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Category } from '../components/ui.jsx';

export default function ManageModules() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [modules, setModules] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [assign, setAssign] = useState({ department: '', dueDate: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api.get('/modules').then((r) => setModules(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
    api.get('/users/departments').then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? Enrolments for this module will also be removed.`)) return;
    try { await api.delete(`/modules/${m._id}`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post(`/modules/${assigning._id}/assign`, {
        department: assign.department || undefined,
        dueDate: assign.dueDate || undefined,
      });
      setNotice(`${assigning.title}: ${r.data.message}`);
      setAssigning(null);
    } catch (err) { setError(errMsg(err)); }
  };

  return (
    <>
      <header className="page-head row">
        <h1>Manage modules</h1>
        {isAdmin && <Link className="btn btn-primary" to="/manage/new">New module</Link>}
      </header>
      <Alert>{error}</Alert>
      <Alert tone="ok">{notice}</Alert>

      {!modules ? <p className="muted">Loading…</p> : (
        <div className="panel flush">
          <table className="table">
            <thead><tr><th>Module</th><th>Category</th><th>Audience</th><th className="num">Questions</th><th>Validity</th><th /></tr></thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m._id}>
                  <td><strong>{m.title}</strong>{m.isMandatory && <span className="tag-req inline">Required</span>}{!m.isPublished && <span className="small muted"> (draft)</span>}</td>
                  <td><Category value={m.category} /></td>
                  <td>{m.departments.length ? m.departments.join(', ') : 'Everyone'}</td>
                  <td className="num">{m.questionCount}</td>
                  <td>{m.certificationValidityMonths ? `${m.certificationValidityMonths} months` : 'No expiry'}</td>
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => { setAssigning(m); setAssign({ department: '', dueDate: '' }); }}>Assign</button>
                    {isAdmin && <Link className="btn btn-sm" to={`/manage/${m._id}/edit`}>Edit</Link>}
                    {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => remove(m)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assigning && (
        <div className="modal-backdrop" onClick={() => setAssigning(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submitAssign}>
            <h2>Assign "{assigning.title}"</h2>
            {isAdmin ? (
              <label>Department
                <select value={assign.department} onChange={(e) => setAssign({ ...assign, department: e.target.value })}>
                  <option value="">All employees</option>
                  {departments.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            ) : <p className="muted">This will assign the module to everyone in {user.department}.</p>}
            <label>Due date
              <input type="date" value={assign.dueDate} onChange={(e) => setAssign({ ...assign, dueDate: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setAssigning(null)}>Cancel</button>
              <button className="btn btn-primary">Assign module</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
