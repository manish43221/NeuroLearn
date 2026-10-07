import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import Loader from '../components/Loader';
import ProgressBar from '../components/ProgressBar';

const color = (a) => (a < 60 ? 'bg-red-500' : a < 80 ? 'bg-amber-500' : 'bg-emerald-500');

export default function Result() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  useEffect(() => { api.get(`/results/${id}`).then((x) => setR(x.data)).catch((e) => toast.error(errMsg(e))); }, [id]);
  if (!r) return <Loader />;

  const msg = r.score >= 80 ? 'Excellent work! 🎉' : r.score >= 60 ? 'Good job, keep going 👍' : 'Keep practising, you will get there 💪';
  const weak = r.topicBreakdown.filter((t) => Math.round((t.correct / t.total) * 100) < 60);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="card text-center">
        <p className="text-sm text-slate-500">{r.quizTitle}</p>
        <div className={`mx-auto mt-3 flex h-32 w-32 items-center justify-center rounded-full border-8 text-4xl font-extrabold ${r.score >= 60 ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-500'}`}>{r.score}%</div>
        <p className="mt-3 text-lg font-semibold">{msg}</p>
        <p className="text-sm text-slate-500">{r.correct} of {r.total} correct · {Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
          <Link to={`/quiz/${r.quiz}`} className="btn-primary">Retake quiz</Link>
          <Link to="/performance" className="btn-outline">View performance</Link>
          <button className="btn-outline" onClick={() => window.print()}>📄 Export PDF</button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Topic breakdown</h2>
        <div className="space-y-4">
          {r.topicBreakdown.map((t) => {
            const acc = Math.round((t.correct / t.total) * 100);
            return (
              <div key={t.topic}>
                <div className="mb-1 flex justify-between text-sm"><span>{t.topic}</span><span>{t.correct}/{t.total} · {acc}%</span></div>
                <ProgressBar value={acc} color={color(acc)} />
              </div>
            );
          })}
        </div>
        {weak.length > 0 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">Revise: <b>{weak.map((w) => w.topic).join(', ')}</b></p>}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Review answers</h2>
        {r.answers.map((a, i) => (
          <div key={i} className={`card border-l-4 ${a.isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
            <p className="text-xs text-slate-500">Q{i + 1} · {a.topic}</p>
            <p className="mt-1 font-medium">{a.question}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {a.options.map((o, j) => (
                <li key={j} className={`rounded-lg px-3 py-1.5 ${j === a.correctAnswer ? 'bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : j === a.selected ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : ''}`}>
                  {'ABCD'[j]}. {o} {j === a.correctAnswer && '✓'} {j === a.selected && j !== a.correctAnswer && '✗ (your answer)'}
                </li>
              ))}
            </ul>
            {a.selected === -1 && <p className="mt-2 text-sm text-red-500">Not answered</p>}
            {a.explanation && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">💡 {a.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
