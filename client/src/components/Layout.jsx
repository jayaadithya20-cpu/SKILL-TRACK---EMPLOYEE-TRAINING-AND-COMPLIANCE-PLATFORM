import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

export default function Layout() {
  const { user, logout, isStaff } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.get('/notifications').then((r) => setUnread(r.data.unread)).catch(() => {});
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          SkillTrack
        </div>
        <nav>
          <p className="nav-group">My learning</p>
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/modules">Training modules</NavLink>
          <NavLink to="/certifications">Certifications</NavLink>
          <NavLink to="/notifications">
            Reminders {unread > 0 && <span className="count">{unread}</span>}
          </NavLink>
          {isStaff && (
            <>
              <p className="nav-group">{user.role === 'manager' ? `${user.department} team` : 'Organisation'}</p>
              <NavLink to="/analytics">Analytics</NavLink>
              <NavLink to="/people">People & certificates</NavLink>
              <NavLink to="/manage">Manage modules</NavLink>
            </>
          )}
        </nav>
        <div className="me">
          <div>
            <strong>{user.name}</strong>
            <span>{user.jobTitle || user.role} · {user.department}</span>
          </div>
          <button className="btn-ghost-light" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
          <span className="brand-small">SkillTrack</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
