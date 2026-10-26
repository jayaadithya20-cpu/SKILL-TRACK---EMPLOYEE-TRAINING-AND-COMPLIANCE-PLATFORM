import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { Alert } from '../components/ui.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); nav('/'); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <span className="brand-mark large" aria-hidden="true" />
        <h1>Training records your auditors will trust.</h1>
        <p>Assign courses, test understanding, and keep every certification current before it lapses.</p>
      </section>
      <form className="auth-form" onSubmit={submit}>
        <h2>Sign in</h2>
        <Alert>{error}</Alert>
        <label>Work email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small">New here? <Link to="/register">Create an account</Link></p>
        <div className="demo">
          <p>Demo accounts (password: password123)</p>
          {['admin', 'manager', 'priya'].map((n) => (
            <button type="button" key={n} className="chip" onClick={() => setForm({ email: `${n}@skilltrack.io`, password: 'password123' })}>{n}</button>
          ))}
        </div>
      </form>
    </div>
  );
}
