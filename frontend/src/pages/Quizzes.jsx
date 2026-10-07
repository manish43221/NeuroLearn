import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import Loader from '../components/Loader';

export default function Quizzes() {
  const [list, setList] = useState(null);
  const load = () => api.get('/quizzes').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this quiz?')) return;
    try { await api.delete(`/quizzes/${id}`); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (!list) return <Loader />;
  return (
    <div className="page">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Quizzes</h1>
        <Link to="/courses" className="btn-primary">✨ Generate new quiz</Link>
      </div>
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((q) => (
            <div key={q._id} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="chip">{q.topic}</span>
                <span className="capitalize">{q.difficulty} · {q.questionCount} questions</span>
              </div>
              <h3 className="font-semibold">{q.title}</h3>
              <p className="text-sm text-slate-500">{q.attempts} attempt(s){q.bestScore !== null && ` · best ${q.bestScore}%`} · {q.source === 'offline' ? 'offline bank' : `AI (${q.source})`}</p>
              <div className="mt-2 flex gap-2">
                <Link to={`/quiz/${q._id}`} className="btn-primary !py-1.5">{q.attempts ? 'Retake' : 'Start'}</Link>
                <button className="btn-outline !py-1.5" onClick={() => remove(q._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="card text-center text-slate-500">No quizzes yet. Open a course and click <b>Generate quiz</b>.</div>}
    </div>
  );
}
