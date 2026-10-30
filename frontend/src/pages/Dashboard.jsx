import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import CourseCard from '../components/CourseCard';
import ProgressBar from '../components/ProgressBar';
import Loader from '../components/Loader';

const barColor = (acc) => (acc < 60 ? 'bg-red-500' : acc < 80 ? 'bg-amber-500' : 'bg-emerald-500');

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/results/stats'), api.get('/courses/my')])
      .then(([s, c]) => { setStats(s.data); setCourses(c.data); })
      .catch((e) => toast.error(errMsg(e)));
  }, []);

  if (!stats) return <Loader />;
  const rec = stats.recommendation;

  const takeQuiz = async () => {
    if (!rec?.courseId && !courses.length) return navigate('/courses');
    setBusy(true);
    try {
      const courseId = rec?.courseId || courses[0].course._id;
      const { data } = await api.post('/quizzes/generate', { courseId, topic: rec?.topic ? 'weak' : '', difficulty: 'auto', count: 5 });
      if (data.warning) toast(data.warning, { icon: 'ℹ️' });
      navigate(`/quiz/${data.quiz._id}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="dashboard-theme min-h-[calc(100vh-4rem)]">
      <div className="page space-y-6">
      <div className="dashboard-hero card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-slate-300">{rec ? rec.message : 'Enrol in a course and take your first AI quiz to get personalised insights.'}</p>
        </div>
        <button onClick={takeQuiz} disabled={busy} className="btn dashboard-action">{busy ? 'Generating...' : '✨ Take AI Quiz'}</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="📚" value={stats.enrolledCourses} label="Enrolled courses" />
        <StatCard icon="📝" value={stats.quizzesTaken} label="Quizzes taken" />
        <StatCard icon="🎯" value={`${stats.averageScore}%`} label="Average score" />
        <StatCard icon="⚠️" value={stats.topicsToImprove} label="Topics to improve" />
      </div>

      {(stats.streak > 0 || stats.badges.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.streak > 0 && <span className="chip !bg-orange-100 !text-orange-700">🔥 {stats.streak}-day streak</span>}
          {stats.badges.map((b) => <span key={b.name} className="chip">{b.icon} {b.name}</span>)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Score trend</h2>
          {stats.scoreTrend.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="label" fontSize={12} tick={{ fill: '#64748b' }} />
                <YAxis domain={[0, 100]} fontSize={12} tick={{ fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: '12px', color: '#0f172a' }} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="py-16 text-center text-sm text-slate-500">Take a quiz to see your score trend.</p>}
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Areas to improve</h2>
          {stats.weakTopics.length ? (
            <div className="space-y-4">
              {stats.weakTopics.slice(0, 5).map((t) => (
                <div key={t.topic}>
                  <div className="mb-1 flex justify-between text-sm"><span>{t.topic}</span><span className="font-semibold">{t.accuracy}%</span></div>
                  <ProgressBar value={t.accuracy} color={barColor(t.accuracy)} />
                </div>
              ))}
            </div>
          ) : <p className="py-10 text-center text-sm text-slate-500">No weak topics yet 🎉</p>}
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Continue learning</h2><Link to="/my-courses" className="text-sm text-brand-600">View all</Link></div>
        {courses.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((c) => <CourseCard key={c.course._id} course={c.course} progress={c.progress} showProgress />)}
          </div>
        ) : <div className="card text-center text-slate-500">You have not enrolled in any course. <Link to="/courses" className="font-semibold text-brand-600">Browse courses</Link></div>}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Recent quizzes</h2>
        {stats.recentResults.length ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentResults.map((r) => (
              <li key={r._id}>
                <Link to={`/results/${r._id}`} className="flex items-center justify-between py-3 text-sm hover:text-brand-600">
                  <span className="truncate pr-4">{r.quizTitle}</span>
                  <span className={`font-bold ${r.score >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>{r.score}%</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No quizzes yet.</p>}
      </section>
      </div>
    </main>
  );
}
