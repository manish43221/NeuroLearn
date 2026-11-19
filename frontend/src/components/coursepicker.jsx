import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import Loader from './Loader';

// Loads the user's enrolled courses and lets them pick one. onChange(courseId, courseObject)
export default function CoursePicker({ value, onChange }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/courses/my');
      setList(data);
      if (data[0] && !value) onChange(data[0].course._id, data[0].course);
    } catch (requestError) {
      setList([]);
      setError(errMsg(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="card text-center text-sm text-red-600" role="alert">
        Could not load your courses: {error}
        <button type="button" className="btn-outline mt-3" onClick={loadCourses}>Try again</button>
      </div>
    );
  }
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