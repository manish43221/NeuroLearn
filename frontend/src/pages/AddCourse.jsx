import { Link } from 'react-router-dom';
import CourseForm from './CourseForm';

export default function AddCourse() {
  return (
    <div className="page">
      <div className="mx-auto mb-2 max-w-3xl">
        <Link to="/courses" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">
          ← Back to courses
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Add a new course</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create a course for learners. Add topics and lessons so students can enrol and start learning.
        </p>
      </div>
      <CourseForm standalone />
    </div>
  );
}
