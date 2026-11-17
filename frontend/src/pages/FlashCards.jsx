import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { errMsg } from '../services/api';
import CoursePicker from '../components/CoursePicker';

const defaultStats = {
  totalCards: 0,
  reviewedCards: 0,
  dueCards: 0,
  totalReviews: 0,
  known: 0,
  difficult: 0,
  forgotten: 0,
  recallRate: 0,
  currentStreak: 0,
  longestStreak: 0,
  topics: [],
  activity: [],
};

const ratingOptions = [
  { value: 'forgotten', label: "I don't know", icon: '↻', style: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40' },
  { value: 'difficult', label: 'Difficult', icon: '◐', style: 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40' },
  { value: 'known', label: 'I know', icon: '✓', style: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40' },
];

const blankCustom = { front: '', back: '', topic: '', difficulty: 'medium' };

function Stat({ icon, label, value, note }) {
  return (
    <div className="card flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl dark:bg-brand-900/40">{icon}</span>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
        {note && <div className="mt-1 text-[11px] text-slate-400">{note}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export default function Flashcards() {
  const [courseId, setCourseId] = useState('');
  const [course, setCourse] = useState(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [cards, setCards] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deck, setDeck] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState(blankCustom);
  const [customBusy, setCustomBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    const [cardResponse, dueResponse, statsResponse] = await Promise.all([
      api.get('/flashcards'),
      api.get('/flashcards', { params: { due: true } }),
      api.get('/flashcards/stats'),
    ]);
    setCards(cardResponse.data);
    setDueCards(dueResponse.data);
    setStats({ ...defaultStats, ...statsResponse.data });
    setLoadError('');
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        setLoadError(errMsg(error));
        toast.error(errMsg(error));
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const visibleCards = useMemo(() => cards.filter((card) => {
    const cardCourse = card.course?._id || card.course;
    return (!filterCourse || String(cardCourse) === filterCourse)
      && (!filterTopic || card.topic === filterTopic)
      && (!search.trim() || card.front.toLowerCase().includes(search.trim().toLowerCase()));
  }), [cards, filterCourse, filterTopic, search]);

  const courseOptions = useMemo(() => {
    const map = new Map();
    cards.forEach((card) => {
      const id = card.course?._id || card.course;
      if (id) map.set(String(id), card.course?.title || 'Course');
    });
    return [...map.entries()];
  }, [cards]);

  const filterTopicOptions = useMemo(
    () => [...new Set(cards
      .filter((card) => !filterCourse || String(card.course?._id || card.course) === filterCourse)
      .map((card) => card.topic))].sort(),
    [cards, filterCourse]
  );

  const currentCard = deck[activeIndex];
  const currentHint = currentCard?.back.split(/\s+/).slice(0, Math.max(3, Math.ceil(currentCard.back.split(/\s+/).length / 3))).join(' ');

  const startSession = (items, message) => {
    if (!items.length) {
      toast('No cards to study yet. Generate or create a card first.');
      return;
    }
    setDeck(items);
    setActiveIndex(0);
    setRevealed(false);
    setHintVisible(false);
    if (message) toast.success(message);
    document.getElementById('study-session')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const move = (offset) => {
    if (!deck.length) return;
    setActiveIndex((index) => (index + offset + deck.length) % deck.length);
    setRevealed(false);
    setHintVisible(false);
  };

  const generate = async (event) => {
    event.preventDefault();
    if (!courseId) return toast.error('Choose an enrolled course first');
    setGenerating(true);
    try {
      const { data } = await api.post('/flashcards/generate', { courseId, topic, difficulty, count: Number(count) });
      await refresh();
      startSession(data.cards, `${data.cards.length} cards saved${data.source === 'offline' ? ' using course materials' : ' to My Flashcards'}`);
      if (data.warning) toast(data.warning, { icon: 'ℹ️', duration: 6000 });
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setGenerating(false);
    }
  };

  const rateCard = async (rating) => {
    if (!currentCard || ratingBusy) return;
    setRatingBusy(true);
    try {
      const { data } = await api.post(`/flashcards/${currentCard._id}/reviews`, { rating });
      setCards((old) => old.map((card) => card._id === data.card._id ? { ...card, ...data.card } : card));
      const nextLabel = ratingOptions.find((option) => option.value === rating)?.label;
      toast.success(`${nextLabel} — next review ${rating === 'forgotten' ? 'in about 10 minutes' : rating === 'difficult' ? 'tomorrow or later' : 'in a few days'}`);
      setRevealed(false);
      setHintVisible(false);
      if (activeIndex + 1 < deck.length) setActiveIndex(activeIndex + 1);
      else if (deck.length > 1) setActiveIndex(0);
      await refresh();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setRatingBusy(false);
    }
  };

  const submitCustom = async (event) => {
    event.preventDefault();
    if (!courseId) return toast.error('Choose a course before creating a card');
    setCustomBusy(true);
    try {
      const { data } = await api.post('/flashcards', { ...custom, courseId });
      setCustom(blankCustom);
      await refresh();
      toast.success('Custom card saved');
      startSession([data], 'Your card is ready to study');
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setCustomBusy(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.patch(`/flashcards/${editing._id}`, {
        front: editing.front,
        back: editing.back,
        topic: editing.topic,
        difficulty: editing.difficulty,
      });
      setCards((old) => old.map((card) => card._id === data._id ? { ...card, ...data } : card));
      setEditing(null);
      await refresh();
      toast.success('Flashcard updated');
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  const deleteCard = async (card) => {
    if (!window.confirm('Delete this flashcard and its review history?')) return;
    try {
      await api.delete(`/flashcards/${card._id}`);
      setCards((old) => old.filter((item) => item._id !== card._id));
      setDueCards((old) => old.filter((item) => item._id !== card._id));
      await refresh();
      toast.success('Flashcard deleted');
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!currentCard || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setRevealed((value) => !value);
      } else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key === 'ArrowRight') move(1);
      else if (revealed && event.key === '1') rateCard('forgotten');
      else if (revealed && event.key === '2') rateCard('difficult');
      else if (revealed && event.key === '3') rateCard('known');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, deck.length, revealed, ratingBusy]);

  const cardFace = revealed ? 'Answer' : 'Question';

  return (
    <div className="page max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="nl-eyebrow">ACTIVE RECALL · SPACED REVISION</div>
          <h1 className="nl-title">Memory Coach</h1>
          <p className="nl-lead">Generate, practise, and revisit your course knowledge. Your cards and review history are saved to your account.</p>
        </div>
        <a href="#generate-cards" className="btn-primary">✦ Generate cards</a>
      </div>

      <section aria-label="Memory overview" className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="▤" label="Cards saved" value={loading ? '…' : stats.totalCards} />
        <Stat icon="✓" label="Recall rate" value={`${stats.recallRate}%`} note={`${stats.totalReviews} reviews recorded`} />
        <Stat icon="↻" label="Cards due" value={stats.dueCards} note="Ready for revision" />
        <Stat icon="🔥" label="Current streak" value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`} note={`Longest: ${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`} />
      </section>

      <section id="generate-cards" className="mb-7 scroll-mt-24">
        <div className="mb-3">
          <h2 className="text-xl font-bold">Generate with AI</h2>
          <p className="mt-1 text-sm text-slate-500">Saved cards belong to your account. Choose a topic and challenge level.</p>
        </div>
        <form onSubmit={generate} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <CoursePicker value={courseId} onChange={(id, selectedCourse) => { setCourseId(id); setCourse(selectedCourse || null); setTopic(''); }} />
          </div>
          <div>
            <label className="label" htmlFor="memory-topic">Topic</label>
            <select id="memory-topic" className="input" value={topic} onChange={(event) => setTopic(event.target.value)} disabled={!course}>
              <option value="">All topics</option>
              {(course?.topics || []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="memory-difficulty">Difficulty</label>
            <select id="memory-difficulty" className="input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="memory-count">Number of cards</label>
            <select id="memory-count" className="input" value={count} onChange={(event) => setCount(Number(event.target.value))}>
              {[5, 10, 15, 20].map((number) => <option key={number} value={number}>{number} cards</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={generating || loading || !courseId}>
              {generating ? <><span className="animate-spin">◌</span> Creating and saving…</> : '✦ Generate and save cards'}
            </button>
            <span className="ml-3 text-xs text-slate-500">If AI is unavailable, accurate lesson/question-bank cards are used when available.</span>
          </div>
        </form>
      </section>

      {currentCard && (
        <section id="study-session" className="mb-8 scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Study session</h2>
              <p className="mt-1 text-sm text-slate-500">{deck.length} cards · Use ← → to navigate, Space to reveal, 1–3 to rate.</p>
            </div>
            <button type="button" className="btn-outline" onClick={() => { setDeck(shuffle(deck)); setActiveIndex(0); setRevealed(false); setHintVisible(false); }}>⤨ Shuffle cards</button>
          </div>
          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>Card {activeIndex + 1} of {deck.length}</span>
              <span>{currentCard.topic} · {currentCard.difficulty}</span>
            </div>
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              aria-label={`${revealed ? 'Hide answer' : 'Reveal answer'}: ${cardFace}`}
              className={`memory-flashcard w-full rounded-2xl border p-6 text-center sm:min-h-64 sm:p-10 ${revealed ? 'is-revealed' : ''}`}
            >
              <span className="chip">{cardFace}</span>
              <span className="mx-auto mt-5 block max-w-3xl whitespace-pre-wrap text-lg font-semibold leading-relaxed sm:text-2xl">
                {revealed ? currentCard.back : currentCard.front}
              </span>
              <span className="mt-6 block text-xs text-slate-500">{revealed ? 'Click to hide answer' : 'Click the card or press Space to reveal'}</span>
            </button>
            {!revealed && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-outline" onClick={() => setHintVisible((value) => !value)}>{hintVisible ? 'Hide hint' : '💡 Show hint'}</button>
                <button type="button" className="btn-primary" onClick={() => setRevealed(true)}>Reveal answer</button>
              </div>
            )}
            {hintVisible && !revealed && <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Hint: {currentHint}…</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button type="button" className="btn-outline" onClick={() => move(-1)}>← Previous</button>
              {revealed && ratingOptions.map((option, index) => (
                <button key={option.value} type="button" disabled={ratingBusy} onClick={() => rateCard(option.value)} className={`btn border bg-transparent disabled:opacity-50 ${option.style}`}>
                  {option.icon} {option.label} <span className="text-xs opacity-70">({index + 1})</span>
                </button>
              ))}
              <button type="button" className="btn-outline" onClick={() => move(1)}>Next →</button>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((activeIndex + 1) / deck.length) * 100}%` }} />
            </div>
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Review due cards</h2>
            <p className="mt-1 text-sm text-slate-500">Forgotten cards come first, followed by difficult cards.</p>
          </div>
          <button type="button" className="btn-primary" disabled={!dueCards.length} onClick={() => startSession(dueCards, 'Due review started')}>
            Review {stats.dueCards} due {stats.dueCards === 1 ? 'card' : 'cards'}
          </button>
        </div>
        {loading ? <div className="grid gap-3 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div> : dueCards.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dueCards.slice(0, 3).map((card) => (
              <button key={card._id} type="button" onClick={() => startSession(dueCards, 'Due review started')} className="card text-left transition hover:border-brand-400">
                <span className="chip">{card.topic}</span>
                <p className="mt-3 line-clamp-2 font-semibold">{card.front}</p>
                <p className="mt-2 text-xs text-slate-500">{card.lastRating === 'forgotten' ? "Marked: I don't know" : card.lastRating === 'difficult' ? 'Marked: difficult' : 'First review'} · {card.course?.title || 'Course'}</p>
              </button>
            ))}
            {dueCards.length > 3 && <div className="card flex items-center justify-center text-sm text-slate-500">+{dueCards.length - 3} more due cards</div>}
          </div>
        ) : <div className="card text-center text-sm text-slate-500">You’re all caught up. New cards are ready to study above; scheduled reviews will appear here.</div>}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">My flashcards</h2>
            <p className="mt-1 text-sm text-slate-500">Search, filter, edit, or remove your saved cards.</p>
          </div>
          <details className="group">
            <summary className="btn-outline cursor-pointer list-none">＋ Create custom card</summary>
            <form onSubmit={submitCustom} className="card mt-3 grid w-[min(90vw,600px)] gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="custom-front">Question or prompt</label>
                <textarea id="custom-front" required maxLength={500} className="input min-h-20" value={custom.front} onChange={(event) => setCustom({ ...custom, front: event.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="custom-back">Answer</label>
                <textarea id="custom-back" required maxLength={2000} className="input min-h-24" value={custom.back} onChange={(event) => setCustom({ ...custom, back: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="custom-topic">Topic</label>
                <input id="custom-topic" maxLength={80} className="input" value={custom.topic} onChange={(event) => setCustom({ ...custom, topic: event.target.value })} placeholder="e.g. Recursion" />
              </div>
              <div>
                <label className="label" htmlFor="custom-difficulty">Difficulty</label>
                <select id="custom-difficulty" className="input" value={custom.difficulty} onChange={(event) => setCustom({ ...custom, difficulty: event.target.value })}>
                  {['easy', 'medium', 'hard'].map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
                </select>
              </div>
              <button type="submit" disabled={customBusy || !courseId} className="btn-primary sm:col-span-2">{customBusy ? 'Saving…' : 'Save custom card'}</button>
              {!courseId && <p className="text-xs text-amber-700 dark:text-amber-300 sm:col-span-2">Select an enrolled course above before saving a card.</p>}
            </form>
          </details>
        </div>
        <div className="card mb-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="filter-course">Filter by course</label>
            <select id="filter-course" className="input" value={filterCourse} onChange={(event) => { setFilterCourse(event.target.value); setFilterTopic(''); }}>
              <option value="">All courses</option>
              {courseOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-topic">Filter by topic</label>
            <select id="filter-topic" className="input" value={filterTopic} onChange={(event) => setFilterTopic(event.target.value)}>
              <option value="">All topics</option>
              {filterTopicOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="search-cards">Search questions</label>
            <input id="search-cards" className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a question…" />
          </div>
        </div>
        {loading ? <div className="grid gap-3 md:grid-cols-2"><SkeletonCard /><SkeletonCard /></div> : loadError ? (
          <div className="card text-center text-sm text-red-600">{loadError} <button type="button" onClick={() => { setLoading(true); refresh().catch((error) => toast.error(errMsg(error))).finally(() => setLoading(false)); }} className="ml-2 underline">Try again</button></div>
        ) : visibleCards.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleCards.map((card) => (
              <article key={card._id} className="card min-w-0">
                {editing?._id === card._id ? (
                  <form onSubmit={saveEdit} className="space-y-3">
                    <div><label className="label">Question</label><textarea required maxLength={500} className="input min-h-16" value={editing.front} onChange={(event) => setEditing({ ...editing, front: event.target.value })} /></div>
                    <div><label className="label">Answer</label><textarea required maxLength={2000} className="input min-h-20" value={editing.back} onChange={(event) => setEditing({ ...editing, back: event.target.value })} /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label className="label">Topic</label><input required maxLength={80} className="input" value={editing.topic} onChange={(event) => setEditing({ ...editing, topic: event.target.value })} /></div>
                      <div><label className="label">Difficulty</label><select className="input" value={editing.difficulty} onChange={(event) => setEditing({ ...editing, difficulty: event.target.value })}>{['easy', 'medium', 'hard'].map((level) => <option key={level}>{level}</option>)}</select></div>
                    </div>
                    <div className="flex gap-2"><button type="submit" className="btn-primary">Save</button><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button></div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="chip">{card.topic}</span>
                      <span className="text-xs capitalize text-slate-500">{card.difficulty} · {card.course?.title || 'Course'}</span>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer font-semibold leading-relaxed">{card.front}</summary>
                      <p className="mt-3 whitespace-pre-wrap border-l-2 border-brand-400 pl-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{card.back}</p>
                    </details>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700">
                      <span>{card.reviewCount} reviews · {card.lastRating ? `Last: ${card.lastRating}` : 'Not reviewed yet'}</span>
                      <div className="flex gap-2">
                        <button type="button" className="btn-outline !px-3 !py-1.5" onClick={() => setEditing({ ...card })}>Edit</button>
                        <button type="button" className="btn-outline !px-3 !py-1.5 text-red-600" onClick={() => deleteCard(card)}>Delete</button>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : <div className="card py-10 text-center">
          <div className="text-3xl">🧠</div>
          <h3 className="mt-2 font-semibold">{cards.length ? 'No cards match those filters' : 'Your card library is ready'}</h3>
          <p className="mt-1 text-sm text-slate-500">{cards.length ? 'Try another search or clear a filter.' : 'Generate cards from an enrolled course or add your own custom card.'}</p>
          {!cards.length && <a href="#generate-cards" className="btn-primary mt-4">Generate your first cards</a>}
        </div>}
      </section>

      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-xl font-bold">Memory analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Progress is calculated from your saved cards and actual review history.</p>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon="🗂" label="Cards reviewed" value={stats.reviewedCards} note={`${stats.totalReviews} total review attempts`} />
          <Stat icon="✓" label="Remembered" value={stats.known} note="I know responses" />
          <Stat icon="◐" label="Difficult" value={stats.difficult} note="Revisit sooner" />
          <Stat icon="↻" label="Forgotten" value={stats.forgotten} note="Repeat in about 10 minutes" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card min-w-0">
            <h3 className="mb-3 font-semibold">Daily learning activity · 30 days</h3>
            {stats.activity.some((day) => day.reviews) ? (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={stats.activity} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                  <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} interval={6} fontSize={10} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} width={34} fontSize={10} stroke="#94a3b8" />
                  <Tooltip labelFormatter={(value) => `Date: ${value}`} />
                  <Line type="monotone" dataKey="reviews" name="Reviews" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-56 items-center justify-center text-sm text-slate-500">Review some cards to see your daily activity.</div>}
          </div>
          <div className="card min-w-0">
            <h3 className="mb-3 font-semibold">Recall by topic</h3>
            {stats.topics.length ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={stats.topics} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                  <XAxis type="number" domain={[0, 100]} unit="%" fontSize={10} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="topic" width={95} fontSize={10} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="recallRate" name="Recall" fill="#10b981" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex h-56 items-center justify-center text-sm text-slate-500">Topic performance appears after your first review.</div>}
          </div>
        </div>
        {stats.topics.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.topics.map((item) => (
              <div key={item.topic} className="card !p-4">
                <div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{item.topic}</span><strong>{item.recallRate}%</strong></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${item.recallRate}%` }} /></div>
                <p className="mt-1 text-xs text-slate-500">{item.recalled} recalled from {item.reviewed} reviews</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
