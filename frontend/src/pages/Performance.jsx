import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';

const fill = (a) => (a < 60 ? '#ef4444' : a < 80 ? '#f59e0b' : '#10b981');
const label = { weak: '⚠ Weak', good: '✓ Good', strong: '⭐ Strong' };

export default function Performance() {
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/results/stats'), api.get('/results/leaderboard'), api.get('/results?limit=15')])
      .then(([s, b, h]) => { setStats(s.data); setBoard(b.data); setHistory(h.data); })
      .catch((e) => toast.error(errMsg(e)));
  }, []);

  if (!stats) return <Loader />;
  if (!stats.quizzesTaken) return <div className="page"><div className="card text-center text-slate-500">No data yet. <Link to="/courses" className="font-semibold text-brand-600">Take your first quiz</Link> to see analytics.</div></div>;

  return (
    <div className="page space-y-6">
      <h1 className="text-2xl font-bold">Performance</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="🎯" value={`${stats.averageScore}%`} label="Average score" />
        <StatCard icon="🏅" value={`${stats.bestScore}%`} label="Best score" />
        <StatCard icon="📝" value={stats.quizzesTaken} label="Quizzes taken" />
        <StatCard icon="🔥" value={stats.streak} label="Day streak" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Topic-wise accuracy</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.topics} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis type="number" domain={[0, 100]} fontSize={12} />
              <YAxis type="category" dataKey="topic" width={90} fontSize={12} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>{stats.topics.map((t) => <Cell key={t.topic} fill={fill(t.accuracy)} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="mb-4 font-semibold">Score trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.scoreTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Topic report</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Topic</th><th>Correct</th><th>Accuracy</th><th>Level</th></tr></thead>
            <tbody>
              {stats.topics.map((t) => (
                <tr key={t.topic} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-medium">{t.topic}</td><td>{t.correct}/{t.total}</td><td>{t.accuracy}%</td><td>{label[t.level]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.courseStats.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-500">Course-wise average</h3>
              {stats.courseStats.map((c) => <div key={c.course} className="flex justify-between border-t border-slate-100 py-2 text-sm dark:border-slate-800"><span>{c.course} <span className="text-slate-400">({c.quizzes} quizzes)</span></span><b>{c.average}%</b></div>)}
            </>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">🏆 Leaderboard</h2>
          <ul className="space-y-2">
            {board.map((b) => (
              <li key={b.rank} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${b.isMe ? 'bg-brand-50 font-semibold dark:bg-brand-900/30' : ''}`}>
                <span>{['🥇', '🥈', '🥉'][b.rank - 1] || `#${b.rank}`} {b.name} {b.isMe && '(you)'}</span>
                <span>{b.average}% · {b.quizzes} quizzes</span>
              </li>
            ))}
          </ul>
          {stats.badges.length > 0 && (
            <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-slate-500">Your badges</h3><div className="flex flex-wrap gap-2">{stats.badges.map((b) => <span key={b.name} className="chip">{b.icon} {b.name}</span>)}</div></div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Quiz history</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Quiz</th><th>Difficulty</th><th>Score</th><th>Date</th><th /></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3">{h.quizTitle}</td><td className="capitalize">{h.difficulty}</td>
                  <td className={`font-bold ${h.score >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>{h.score}%</td>
                  <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td><Link className="text-brand-600" to={`/results/${h._id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
