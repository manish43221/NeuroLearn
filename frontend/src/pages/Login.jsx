import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';

const demoAccounts = [
  { role: 'Student', name: 'Aanya Sharma', email: 'student@neurolearn.com', password: 'Student@123' },
  { role: 'Student', name: 'Rohan Verma', email: 'student2@neurolearn.com', password: 'Student2@123' },
  { role: 'Student', name: 'Meera Patel', email: 'student3@neurolearn.com', password: 'Student3@123' },
  { role: 'Teacher', name: 'Prof. Sharma', email: 'teacher@neurolearn.com', password: 'Teacher@123' },
  { role: 'Teacher', name: 'Prof. Khan', email: 'teacher2@neurolearn.com', password: 'Teacher2@123' },
  { role: 'Admin', name: 'Demo Admin', email: 'admin@neurolearn.com', password: 'Admin@123' },
];

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

  const demo = (email, password) => {
    setForm({ email, password });
    toast.success('Demo login details filled');
  };

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
      <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-800 dark:bg-brand-900/20">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Demo accounts</h2>
          <span className="chip">6 sample users</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Choose an account to fill the login form. Local demo data only.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
              onClick={() => demo(account.email, account.password)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{account.name}</span>
                <span className="chip">{account.role}</span>
              </span>
              <span className="mt-2 block break-all text-xs text-slate-500">Email: {account.email}</span>
              <span className="mt-1 block text-xs text-slate-500">Password: {account.password}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
