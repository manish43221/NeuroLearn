import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loader from './Loader';

// Loads the user's enrolled courses and lets them pick one. onChange(courseId, courseObject)
export default function CoursePicker({ value, onChange }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    api.get('/courses/my').then((r) => {
      setList(r.data);
      if (r.data[0] && !value) onChange(r.data[0].course._id, r.data[0].course);
    }).catch(() => setList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!list) return <Loader />;
  if (!list.length) return <div className="card text-center text-slate-500">Enrol in a course first. <Link className="text-brand-600 underline" to="/courses">Browse courses</Link></div>;
  return (
    <div>
      <label className="label">Course</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value, list.find((x) => x.course._id === e.target.value)?.course)}>
        {list.map((x) => <option key={x.course._id} value={x.course._id}>{x.course.title}</option>)}
      </select>
    </div>
  );
}