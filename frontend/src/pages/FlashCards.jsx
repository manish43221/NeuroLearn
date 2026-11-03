import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import CoursePicker from '../components/coursepicker';

export default function Flashcards() {
  const [courseId, setCourseId] = useState('');
  const [course, setCourse] = useState(null);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState([]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [reviewState, setReviewState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nl_memory_reviews') || '{}'); } catch { return {}; }
  });

  const make = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/ai/flashcards', { courseId, topic, count: 10 });
      setCards(data.cards); setI(0); setFlip(false); setKnown(new Set());
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const go = (n) => { setI((i + n + cards.length) % cards.length); setFlip(false); };
  const card = cards[i];
  const review = (rating) => {
    if (!card) return;
    const key = `${courseId}:${topic}:${card.front}`;
    const previous = reviewState[key] || { interval: 0, reviews: 0 };
    const days = rating === 'again' ? 0 : rating === 'hard' ? 1 : rating === 'good' ? Math.max(2, previous.interval * 2) : Math.max(4, previous.interval * 3);
    const next = { ...reviewState, [key]: { interval: days, reviews: previous.reviews + 1, dueAt: Date.now() + days * 86400000, rating } };
    setReviewState(next);
    localStorage.setItem('nl_memory_reviews', JSON.stringify(next));
    if (rating === 'good' || rating === 'easy') setKnown((old) => new Set(old).add(i));
    go(1);
  };

  return (
    <div className="page max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Memory Coach</h1>
      <p className="mb-4 text-sm text-slate-500">Generate revision cards, retrieve the answer from memory, then rate how easily you recalled it.</p>
      <div className="card grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><CoursePicker value={courseId} onChange={(id, c) => { setCourseId(id); setCourse(c); setTopic(''); }} /></div>
        <div>
          <label className="label">Topic</label>
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {(course?.topics || []).map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn-primary w-full" onClick={make} disabled={busy || !courseId}>{busy ? 'Creating...' : 'Generate cards'}</button></div>
      </div>

      {cards.length > 0 && <p className="mt-3 text-xs text-slate-500">Memory Coach uses a simple review interval: Again = today, Hard = 1 day, Good = 2× the previous interval, Easy = 3× (minimum 4 days). Review progress is saved in this browser.</p>}
      {card && (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm text-slate-500"><span>Card {i + 1} of {cards.length}</span><span>Known: {known.size}/{cards.length}</span></div>
          <button onClick={() => setFlip(!flip)} className={`card flex min-h-[220px] w-full items-center justify-center text-center text-lg transition ${flip ? '!bg-brand-50 dark:!bg-brand-900/30' : ''}`}>
            <div>{flip ? <p>{card.back}</p> : <p className="font-semibold">{card.front}</p>}<p className="mt-4 text-xs text-slate-400">{flip ? 'Answer' : 'Click to reveal answer'}</p></div>
          </button>
          <div className="mt-3 flex justify-center gap-2">
            <button className="btn-outline" onClick={() => go(-1)}>Previous</button>
            <button className="btn-outline" onClick={() => review('again')}>Again</button>
            <button className="btn-outline" onClick={() => review('hard')}>Hard</button>
            <button className="btn-outline" onClick={() => review('good')}>Good</button>
            <button className="btn-primary" onClick={() => review('easy')}>Easy</button>
          </div>
        </div>
      )}
    </div>
  );
}