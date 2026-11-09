import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import Loader from '../components/Loader';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [quiz, setQuiz] = useState({ topic: '', difficulty: 'auto', count: 5 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/courses/${id}`).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (data && window.location.hash === '#quiz') {
      document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data]);

  if (!data) return <Loader />;
  const { course, enrollment } = data;
  const canGenerate = enrollment.enrolled || user.role !== 'student';
  const canEdit = user.role === 'admin' || course.createdBy?._id === user._id;

  const enroll = async () => {
    try { await api.post(`/courses/${id}/enroll`); toast.success('Enrolled!'); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const unenroll = async () => {
    if (!confirm('Unenrol from this course?')) return;
    try { await api.delete(`/courses/${id}/enroll`); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const toggleLesson = async (lessonId, done) => {
    try {
      await (done ? api.delete : api.post)(`/courses/${id}/lessons/${lessonId}/complete`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const generate = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post('/quizzes/generate', { courseId: id, ...quiz });
      if (res.warning) toast(res.warning, { icon: 'ℹ️', duration: 6000 });
      navigate(`/quiz/${res.quiz._id}`);
    } catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };

  return (
    <div className="page grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card">
          <div className="flex items-center gap-2"><span className="chip">{course.category}</span><span className="text-xs capitalize text-slate-500">{course.difficulty}</span></div>
          <h1 className="mt-2 text-2xl font-bold">{course.title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{course.description}</p>
          <p className="mt-2 text-xs text-slate-500">By {course.createdBy?.name} · {course.enrolledCount} students</p>
          <div className="mt-3 flex flex-wrap gap-1">{course.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {enrollment.enrolled ? <button className="btn-outline" onClick={unenroll}>Unenrol</button> : <button className="btn-primary" onClick={enroll}>Enrol in course</button>}
            {canEdit && <Link to={`/manage/course/${course._id}`} className="btn-outline">✏️ Edit course</Link>}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Lessons ({course.lessons.length})</h2>
            {enrollment.enrolled && <span className="text-sm text-slate-500">{enrollment.progress}% complete</span>}
          </div>
          {enrollment.enrolled && <div className="mb-4"><ProgressBar value={enrollment.progress} /></div>}
          <ul className="space-y-2">
            {course.lessons.map((l, i) => {
              const done = enrollment.completedLessons.includes(l._id);
              return (
                <li key={l._id} className="rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 p-3">
                    {enrollment.enrolled && <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={done} onChange={() => toggleLesson(l._id, done)} />}
                    <button className="flex-1 text-left" onClick={() => setOpen(open === l._id ? null : l._id)}>
                      <span className={`font-medium ${done ? 'text-slate-400 line-through' : ''}`}>{i + 1}. {l.title}</span>
                      {l.topic && <span className="ml-2 text-xs text-slate-500">· {l.topic}</span>}
                    </button>
                    <span className="text-slate-400">{open === l._id ? '▲' : '▼'}</span>
                  </div>
                  {open === l._id && <p className="border-t border-slate-100 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">{l.content || 'No content yet.'}</p>}
                </li>
              );
            })}
            {!course.lessons.length && <li className="text-sm text-slate-500">No lessons added yet.</li>}
          </ul>
        </div>
      </div>

      <aside id="quiz" className="card h-fit space-y-4">
        <h2 className="font-semibold">✨ Generate AI quiz</h2>
        {canGenerate ? (
          <>
            <div>
              <label className="label">Topic</label>
              <select className="input" value={quiz.topic} onChange={(e) => setQuiz({ ...quiz, topic: e.target.value })}>
                <option value="">All topics</option>
                <option value="weak">My weakest topic</option>
                {course.topics.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={quiz.difficulty} onChange={(e) => setQuiz({ ...quiz, difficulty: e.target.value })}>
                <option value="auto">Auto (adaptive)</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Questions: {quiz.count}</label>
              <input type="range" min="3" max="15" className="w-full accent-brand-600" value={quiz.count} onChange={(e) => setQuiz({ ...quiz, count: Number(e.target.value) })} />
            </div>
            <button className="btn-primary w-full" onClick={generate} disabled={busy}>{busy ? 'Generating...' : 'Generate quiz'}</button>
          </>
        ) : <p className="text-sm text-slate-500">Enrol in this course to generate quizzes.</p>}
      </aside>
    </div>
  );
}
