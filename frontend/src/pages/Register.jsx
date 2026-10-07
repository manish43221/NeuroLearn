import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'student' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error('Enter your name');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Enter a valid email');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, role: form.role });
      toast.success('Account created!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <div><label className="label">Full name</label><input className="input" value={form.name} onChange={set('name')} autoFocus /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={set('password')} /></div>
          <div><label className="label">Confirm</label><input className="input" type="password" value={form.confirm} onChange={set('confirm')} /></div>
        </div>
        <div>
          <label className="label">I am a</label>
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
        <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-brand-600">Log in</Link></p>
      </form>
    </div>
  );
}
