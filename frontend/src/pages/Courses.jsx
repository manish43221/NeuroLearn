import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import CourseCard from '../components/CourseCard';
import Loader from '../components/Loader';

export default function Courses() {
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState(null);
  const [categories, setCategories] = useState([]);
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const difficulty = params.get('difficulty') || '';

  useEffect(() => { api.get('/courses/categories').then((r) => setCategories(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/courses', { params: { search, category, difficulty } })
        .then((r) => setCourses(r.data))
        .catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [search, category, difficulty]);

  const set = (k) => (e) => {
    const next = new URLSearchParams(params);
    e.target.value ? next.set(k, e.target.value) : next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="page">
      <h1 className="mb-4 text-2xl font-bold">Courses</h1>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <input className="input" placeholder="Search courses or topics" value={search} onChange={set('search')} />
        <select className="input" value={category} onChange={set('category')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={difficulty} onChange={set('difficulty')}>
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      {!courses ? <Loader /> : courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c._id} course={c} />)}</div>
      ) : <div className="card text-center text-slate-500">No courses found.</div>}
    </div>
  );
}
