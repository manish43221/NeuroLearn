import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import CourseCard from '../components/CourseCard';
import Loader from '../components/Loader';

export default function MyCourses() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/courses/my').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!list) return <Loader />;
  return (
    <div className="page">
      <h1 className="mb-4 text-2xl font-bold">My Courses</h1>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => <CourseCard key={c.course._id} course={c.course} progress={c.progress} showProgress />)}
        </div>
      ) : <div className="card text-center text-slate-500">No enrolled courses yet. <Link to="/courses" className="font-semibold text-brand-600">Browse courses</Link></div>}
    </div>
  );
}
