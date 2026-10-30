import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import CoursePicker from '../components/coursepicker';

export default function StudyPlan() {
  const [courseId, setCourseId] = useState('');
  const [days, setDays] = useState(7);
  const [hours, setHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const handleDaysChange = (e) => setDays(Math.min(14, Math.max(3, Number(e.target.value) || 3)));
  const handleHoursChange = (e) => setHours(Math.min(6, Math.max(0.5, Number(e.target.value) || 1)));

  const make = async () => {
    setBusy(true);
    try {
      setRes((await api.post('/ai/study-plan', {
        courseId,
        days: Number(days),
        hoursPerDay: Number(hours),
      })).data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">📅 Personalized Study Plan</h1>
      <p className="mb-4 text-sm text-slate-500">Built from your quiz results: weak topics come first.</p>
      <div className="card grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><CoursePicker value={courseId} onChange={setCourseId} /></div>
        <div><label className="label">Days</label><input type="number" min="3" max="14" className="input" value={days} onChange={handleDaysChange} /></div>
        <div><label className="label">Hours per day</label><input type="number" min="0.5" max="6" step="0.5" className="input" value={hours} onChange={handleHoursChange} /></div>
        <div className="flex items-end"><button className="btn-primary w-full" onClick={make} disabled={busy || !courseId}>{busy ? 'Planning...' : 'Generate plan'}</button></div>
      </div>

      {res && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{res.days}-day plan for {res.course}</h2>
            <span className="chip">{res.source === 'ai' ? 'AI generated' : 'rule-based'}</span>
            <button className="btn-outline ml-auto !py-1.5 print:hidden" onClick={() => window.print()}>Print</button>
          </div>
          {res.weakTopics.length > 0 && <p className="mb-3 text-sm">Focus first: {res.weakTopics.map((w) => <span key={w.topic} className="chip mr-1">{w.topic} {w.accuracy}%</span>)}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {res.plan.map((d) => (
              <div key={d.day} className="card">
                <div className="text-xs text-slate-500">Day {d.day}</div>
                <h3 className="font-semibold">{d.focus}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{d.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}