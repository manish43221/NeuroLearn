import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nl_token');
    if (!token) return setLoading(false);
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('nl_token'))
      .finally(() => setLoading(false));
  }, []);

  const authenticate = (data) => {
    localStorage.setItem('nl_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => authenticate((await api.post('/auth/login', { email, password })).data);
  const register = async (payload) => authenticate((await api.post('/auth/register', payload)).data);
  const logout = () => {
    localStorage.removeItem('nl_token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
