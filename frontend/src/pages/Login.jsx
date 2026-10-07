import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Enter a valid email');
    if (!form.password) return toast.error('Enter your password');
    setBusy(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const demo = (email, password) => setForm({ email, password });

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold">Log in</h1>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in...' : 'Log in'}</button>
        <p className="text-center text-sm text-slate-500">
          New here? <Link to="/register" className="font-semibold text-brand-600">Create an account</Link>
        </p>
      </form>
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">
        Demo accounts (after <code>npm run seed</code>):
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-outline !px-2 !py-1 !text-xs" onClick={() => demo('student@neurolearn.com', 'Student@123')}>Student</button>
          <button type="button" className="btn-outline !px-2 !py-1 !text-xs" onClick={() => demo('teacher@neurolearn.com', 'Teacher@123')}>Teacher</button>
          <button type="button" className="btn-outline !px-2 !py-1 !text-xs" onClick={() => demo('admin@neurolearn.com', 'Admin@123')}>Admin</button>
        </div>
      </div>
    </div>
  );
}
