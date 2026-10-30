import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import CourseCard from '../components/CourseCard';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Courses() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState(null);
  const [categories, setCategories] = useState([]);
  const [enrollingId, setEnrollingId] = useState(null);
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

  const enroll = async (course) => {
    setEnrollingId(course._id);
    try {
      await api.post(`/courses/${course._id}/enroll`);
      setCourses((current) => current.map((item) =>
        item._id === course._id ? { ...item, enrolled: true, enrolledCount: (item.enrolledCount || 0) + 1 } : item
      ));
      toast.success(`Enrolled in ${course.title}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="page">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="mt-1 text-sm text-slate-500">Browse courses and enrol to start learning.</p>
        </div>
        {user.role === 'teacher' || user.role === 'admin' ? (
          <Link to="/courses/new" className="btn-primary">＋ Add a new course</Link>
        ) : null}
      </div>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c._id} course={c} onEnroll={!c.enrolled ? () => enroll(c) : undefined} enrolling={enrollingId === c._id} />)}</div>
      ) : <div className="card text-center text-slate-500">No courses found.</div>}
    </div>
  );
}
