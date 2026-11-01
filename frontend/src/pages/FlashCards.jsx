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

  const make = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/ai/flashcards', { courseId, topic, count: 10 });
      setCards(data.cards); setI(0); setFlip(false); setKnown(new Set());
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const go = (n) => { setI((i + n + cards.length) % cards.length); setFlip(false); };
  const card = cards[i];

  return (
    <div className="page max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">🗂️ Flashcards</h1>
      <p className="mb-4 text-sm text-slate-500">Quick revision cards from your course. Click a card to flip it.</p>
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

      {card && (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm text-slate-500"><span>Card {i + 1} of {cards.length}</span><span>Known: {known.size}/{cards.length}</span></div>
          <button onClick={() => setFlip(!flip)} className={`card flex min-h-[220px] w-full items-center justify-center text-center text-lg transition ${flip ? '!bg-brand-50 dark:!bg-brand-900/30' : ''}`}>
            <div>{flip ? <p>{card.back}</p> : <p className="font-semibold">{card.front}</p>}<p className="mt-4 text-xs text-slate-400">{flip ? 'Answer' : 'Click to reveal answer'}</p></div>
          </button>
          <div className="mt-3 flex justify-center gap-2">
            <button className="btn-outline" onClick={() => go(-1)}>Previous</button>
            <button className="btn-outline" onClick={() => { setKnown(new Set(known).add(i)); go(1); }}>I know this ✓</button>
            <button className="btn-primary" onClick={() => go(1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}