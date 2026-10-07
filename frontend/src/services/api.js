import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// expired / invalid token -> back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('nl_token');
      if (!['/login', '/register', '/'].includes(window.location.pathname)) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export default api;
