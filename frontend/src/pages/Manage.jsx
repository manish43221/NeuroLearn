import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

export default function Manage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState('courses');
  const [courses, setCourses] = useState(null);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);

  const loadCourses = () => api.get('/courses', { params: { mine: 'true' } }).then((r) => setCourses(r.data)).catch((e) => toast.error(errMsg(e)));
  const loadUsers = () => api.get('/users').then((r) => setUsers(r.data)).catch((e) => toast.error(errMsg(e)));

  useEffect(() => {
    loadCourses();
    if (isAdmin) { loadUsers(); api.get('/users/overview').then((r) => setOverview(r.data)).catch(() => {}); }
  }, [isAdmin]);

  const delCourse = async (id) => {
    if (!confirm('Delete this course and its quizzes?')) return;
    try { await api.delete(`/courses/${id}`); toast.success('Course deleted'); loadCourses(); } catch (e) { toast.error(errMsg(e)); }
  };
  const setRole = async (id, role) => {
    try { await api.put(`/users/${id}/role`, { role }); toast.success('Role updated'); loadUsers(); } catch (e) { toast.error(errMsg(e)); }
  };
  const delUser = async (id) => {
    if (!confirm('Delete this user and all their data?')) return;
    try { await api.delete(`/users/${id}`); loadUsers(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{isAdmin ? 'Admin panel' : 'Teacher panel'}</h1>
        <Link to="/manage/course/new" className="btn-primary">+ New course</Link>
      </div>

      {overview && (
        <div className="grid gap-4 sm:grid-cols-4">
          {Object.entries(overview).map(([k, v]) => <div key={k} className="card text-center"><div className="text-2xl font-bold">{v}</div><div className="text-sm capitalize text-slate-500">{k}</div></div>)}
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2">
          {['courses', 'users'].map((t) => <button key={t} onClick={() => setTab(t)} className={`btn capitalize ${tab === t ? 'bg-brand-600 text-white' : 'btn-outline'}`}>{t}</button>)}
        </div>
      )}

      {tab === 'courses' && (!courses ? <Loader /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Title</th><th>Category</th><th>Lessons</th><th>Students</th><th /></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 font-medium"><Link to={`/courses/${c._id}`} className="hover:text-brand-600">{c.title}</Link></td>
                  <td>{c.category}</td><td>{c.lessonCount}</td><td>{c.enrolledCount}</td>
                  <td className="space-x-2 text-right">
                    <Link to={`/manage/course/${c._id}`} className="btn-outline !px-3 !py-1">Edit</Link>
                    <button className="btn-danger !px-3 !py-1" onClick={() => delCourse(c._id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!courses.length && <tr><td colSpan="5" className="py-6 text-center text-slate-500">No courses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      ))}

      {tab === 'users' && isAdmin && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Name</th><th>Email</th><th>Role</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 font-medium">{u.name}</td><td>{u.email}</td>
                  <td>
                    <select className="input !w-auto !py-1" value={u.role} disabled={u._id === user._id} onChange={(e) => setRole(u._id, e.target.value)}>
                      <option>student</option><option>teacher</option><option>admin</option>
                    </select>
                  </td>
                  <td className="text-right">{u._id !== user._id && <button className="btn-danger !px-3 !py-1" onClick={() => delUser(u._id)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
