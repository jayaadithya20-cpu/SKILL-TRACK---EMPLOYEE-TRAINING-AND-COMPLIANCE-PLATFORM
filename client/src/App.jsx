import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Modules from './pages/Modules.jsx';
import ModuleDetail from './pages/ModuleDetail.jsx';
import Certifications from './pages/Certifications.jsx';
import Notifications from './pages/Notifications.jsx';
import Analytics from './pages/Analytics.jsx';
import ManageModules from './pages/ManageModules.jsx';
import ModuleForm from './pages/ModuleForm.jsx';
import People from './pages/People.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const staff = ['admin', 'manager'];
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="modules" element={<Modules />} />
        <Route path="modules/:id" element={<ModuleDetail />} />
        <Route path="certifications" element={<Certifications />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Protected roles={staff}><Analytics /></Protected>} />
        <Route path="people" element={<Protected roles={staff}><People /></Protected>} />
        <Route path="manage" element={<Protected roles={staff}><ManageModules /></Protected>} />
        <Route path="manage/new" element={<Protected roles={['admin']}><ModuleForm /></Protected>} />
        <Route path="manage/:id/edit" element={<Protected roles={['admin']}><ModuleForm /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
