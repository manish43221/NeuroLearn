import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import Loader from '../components/Loader';

const empty = { title: '', description: '', category: 'General', difficulty: 'beginner', topics: '', lessons: [] };

export default function CourseForm({ standalone = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(id ? null : empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/courses/${id}`)
      .then(({ data }) => setForm({ ...data.course, topics: data.course.topics.join(', ') }))
      .catch((e) => { toast.error(errMsg(e)); navigate('/manage'); });
  }, [id, navigate]);

  if (!form) return <Loader />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLesson = (i, k, v) => setForm({ ...form, lessons: form.lessons.map((l, j) => (j === i ? { ...l, [k]: v } : l)) });
  const topicList = form.topics.split(',').map((t) => t.trim()).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return toast.error('Title and description are required');
    if (!topicList.length) return toast.error('Add at least one topic (comma separated) - quizzes are generated per topic');
    if (form.lessons.some((l) => !l.title.trim())) return toast.error('Every lesson needs a title');
    setBusy(true);
    try {
      const payload = { title: form.title, description: form.description, category: form.category, difficulty: form.difficulty, topics: topicList, lessons: form.lessons };
      id ? await api.put(`/courses/${id}`, payload) : await api.post('/courses', payload);
      toast.success(id ? 'Course updated' : 'Course created');
      navigate(standalone ? '/courses' : '/manage');
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {!standalone && <h1 className="text-2xl font-bold">{id ? 'Edit course' : 'Create course'}</h1>}
      <div className="card space-y-4">
        <div><label className="label">Title</label><input className="input" value={form.title} onChange={set('title')} /></div>
        <div><label className="label">Description</label><textarea className="input" rows="3" value={form.description} onChange={set('description')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Category</label><input className="input" value={form.category} onChange={set('category')} /></div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={set('difficulty')}><option>beginner</option><option>intermediate</option><option>advanced</option></select>
          </div>
        </div>
        <div><label className="label">Topics (comma separated)</label><input className="input" placeholder="Arrays, Recursion, Sorting" value={form.topics} onChange={set('topics')} /></div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Lessons</h2>
          <button type="button" className="btn-outline" onClick={() => setForm({ ...form, lessons: [...form.lessons, { title: '', topic: topicList[0] || '', content: '' }] })}>+ Add lesson</button>
        </div>
        {form.lessons.map((l, i) => (
          <div key={l._id || i} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex gap-2">
              <input className="input" placeholder={`Lesson ${i + 1} title`} value={l.title} onChange={(e) => setLesson(i, 'title', e.target.value)} />
              <select className="input !w-44" value={l.topic || ''} onChange={(e) => setLesson(i, 'topic', e.target.value)}>
                <option value="">No topic</option>
                {topicList.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button type="button" className="btn-outline !px-3" onClick={() => setForm({ ...form, lessons: form.lessons.filter((_, j) => j !== i) })}>✕</button>
            </div>
            <textarea className="input" rows="3" placeholder="Lesson content (the AI uses this to write better questions)" value={l.content} onChange={(e) => setLesson(i, 'content', e.target.value)} />
          </div>
        ))}
        {!form.lessons.length && <p className="text-sm text-slate-500">No lessons yet.</p>}
      </div>

      <div className="flex gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save course'}</button>
        <button type="button" className="btn-outline" onClick={() => navigate(standalone ? '/courses' : '/manage')}>Cancel</button>
      </div>
    </form>
  );
}
