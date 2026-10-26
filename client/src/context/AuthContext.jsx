import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) return setLoading(false);
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = ({ token, user }) => {
    localStorage.setItem('token', token);
    setUser(user);
  };

  const login = async (email, password) => handleAuth((await api.post('/auth/login', { email, password })).data);
  const register = async (form) => handleAuth((await api.post('/auth/register', form)).data);
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isStaff = user && (user.role === 'admin' || user.role === 'manager');

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
