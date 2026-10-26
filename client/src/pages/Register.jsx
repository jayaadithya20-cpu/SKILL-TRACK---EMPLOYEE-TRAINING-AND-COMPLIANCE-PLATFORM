import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { Alert } from '../components/ui.jsx';

const DEPARTMENTS = ['Engineering', 'Sales', 'Finance', 'Operations', 'HR', 'General'];

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Engineering', jobTitle: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await register(form); nav('/'); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <span className="brand-mark large" aria-hidden="true" />
        <h1>Your required training, in one place.</h1>
        <p>Mandatory courses for your department are added to your plan as soon as you join.</p>
      </section>
      <form className="auth-form" onSubmit={submit}>
        <h2>Create account</h2>
        <Alert>{error}</Alert>
        <label>Full name<input required value={form.name} onChange={set('name')} /></label>
        <label>Work email<input type="email" required value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" minLength={6} required value={form.password} onChange={set('password')} /></label>
        <div className="row-2">
          <label>Department
            <select value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>Job title<input value={form.jobTitle} onChange={set('jobTitle')} /></label>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted small">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
