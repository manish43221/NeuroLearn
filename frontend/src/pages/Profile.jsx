import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const saveName = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put('/auth/me', { name }); setUser(data.user); toast.success('Profile updated'); } catch (err) { toast.error(errMsg(err)); }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match');
    try {
      await api.put('/auth/me', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <form onSubmit={saveName} className="card space-y-4">
        <div><label className="label">Email</label><input className="input opacity-60" value={user.email} disabled /></div>
        <div><label className="label">Role</label><input className="input capitalize opacity-60" value={user.role} disabled /></div>
        <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <button className="btn-primary">Save changes</button>
      </form>
      <form onSubmit={savePw} className="card space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <input className="input" type="password" placeholder="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <input className="input" type="password" placeholder="New password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
        <input className="input" type="password" placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        <button className="btn-primary">Update password</button>
      </form>
    </div>
  );
}
