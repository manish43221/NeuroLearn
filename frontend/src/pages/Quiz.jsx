import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import Loader from '../components/Loader';
import ProgressBar from '../components/ProgressBar';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());
  const answersRef = useRef([]);
  const sent = useRef(false);

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then((r) => {
        setQuiz(r.data);
        setAnswers(new Array(r.data.questions.length).fill(-1));
        answersRef.current = new Array(r.data.questions.length).fill(-1);
        setLeft(r.data.questions.length * 60); // 60 seconds per question
        startedAt.current = Date.now();
      })
      .catch((e) => { toast.error(errMsg(e)); navigate('/quizzes'); });
  }, [id, navigate]);

  const submit = useCallback(async () => {
    if (!quiz || sent.current) return;
    sent.current = true;
    setBusy(true);
    try {
      const { data } = await api.post(`/quizzes/${id}/submit`, {
        answers: quiz.questions.map((q, i) => ({ questionId: q._id, selected: answersRef.current[i] })),
        timeTaken: Math.round((Date.now() - startedAt.current) / 1000),
      });
      navigate(`/results/${data._id}`, { replace: true });
    } catch (e) {
      sent.current = false;
      setBusy(false);
      toast.error(errMsg(e));
    }
  }, [quiz, id, navigate]);

  // countdown timer, auto-submits at 0
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { toast('Time is up! Submitting...', { icon: '⏱️' }); submit(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, submit]);

  if (!quiz) return <Loader text="Loading quiz..." />;
  const q = quiz.questions[current];
  const answered = answers.filter((a) => a !== -1).length;
  const last = current === quiz.questions.length - 1;

  const choose = (i) => {
    const next = [...answers];
    next[current] = i;
    answersRef.current = next;
    setAnswers(next);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold">{quiz.title}</h1>
          <p className="text-sm text-slate-500">Question {current + 1} of {quiz.questions.length} · {answered} answered</p>
        </div>
        <div className={`rounded-xl px-4 py-2 font-mono text-lg font-bold ${left < 30 ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-700'}`}>⏱ {fmt(Math.max(left, 0))}</div>
      </div>
      <ProgressBar value={((current + 1) / quiz.questions.length) * 100} />

      <div className="card mt-5">
        <span className="chip">{q.topic}</span>
        <h2 className="mt-3 text-lg font-semibold">{q.question}</h2>
        <div className="mt-4 space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => choose(i)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${answers[current] === i ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${answers[current] === i ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{'ABCD'[i]}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quiz.questions.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-8 w-8 rounded-lg text-sm font-semibold ${i === current ? 'bg-brand-600 text-white' : answers[i] !== -1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 dark:bg-slate-800'}`}>{i + 1}</button>
        ))}
      </div>

      <div className="mt-5 flex justify-between">
        <button className="btn-outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</button>
        {last ? (
          <button className="btn-primary" disabled={busy} onClick={() => { if (answered < quiz.questions.length && !confirm(`${quiz.questions.length - answered} question(s) unanswered. Submit anyway?`)) return; submit(); }}>{busy ? 'Submitting...' : 'Submit quiz'}</button>
        ) : <button className="btn-primary" onClick={() => setCurrent(current + 1)}>Next →</button>}
      </div>
    </div>
  );
}
