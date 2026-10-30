import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import Loader from '../components/Loader';

export default function Students() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get('/results/students')
      .then((r) => setRows(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, []);
  if (!rows) return <Loader />;
  return (
    <div className="page">
      <h1 className="mb-1 text-2xl font-bold">👨‍🎓 Student Performance</h1>
      <p className="mb-4 text-sm text-slate-500">Students on your courses, lowest average first so you can help who needs it.</p>
      {rows.length ? (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800"><tr>{['Student', 'Quizzes', 'Average', 'Last active', 'Weak topics'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.email}</div></td>
                  <td className="px-4 py-3">{s.quizzes}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${s.average < 60 ? 'text-red-600' : s.average >= 80 ? 'text-green-600' : ''}`}>{s.average}%</span></td>
                  <td className="px-4 py-3">{new Date(s.lastActive).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{s.weakTopics.length ? s.weakTopics.map((t) => <span key={t} className="chip mr-1">{t}</span>) : <span className="text-slate-400">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="card text-center text-slate-500">No quiz attempts yet.</div>}
    </div>
  );
}