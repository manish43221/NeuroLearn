import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import CoursePicker from '../components/CoursePicker';

export default function Tutor() {
  const [courseId, setCourseId] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState([{ role: 'ai', text: 'Hi! I am your AI tutor. Pick a course and ask me anything about it.' }]);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, busy]);

  const send = async (e) => {
    e.preventDefault();
    const question = q.trim();
    if (!question || busy || !courseId) return;
    setChat((c) => [...c, { role: 'me', text: question }]);
    setQ(''); setBusy(true);
    try {
      const { data } = await api.post('/ai/tutor', { courseId, question });
      setChat((c) => [...c, { role: 'ai', text: data.answer, offline: data.source === 'offline' }]);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="page max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">🤖 AI Tutor</h1>
      <p className="mb-4 text-sm text-slate-500">Answers use your course lessons and know your weak topics.</p>
      <CoursePicker value={courseId} onChange={setCourseId} />
      <div className="card mt-4 flex h-[55vh] flex-col gap-3 overflow-y-auto">
        {chat.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'me' ? 'self-end bg-brand-600 text-white' : 'self-start bg-slate-100 dark:bg-slate-800'}`}>
            {m.text}{m.offline && <span className="chip ml-2">offline</span>}
          </div>
        ))}
        {busy && <div className="self-start rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500 dark:bg-slate-800">Thinking...</div>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className="input" placeholder="e.g. Explain recursion with an example" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} />
        <button className="btn-primary" disabled={busy || !courseId}>Ask</button>
      </form>
    </div>
  );
}