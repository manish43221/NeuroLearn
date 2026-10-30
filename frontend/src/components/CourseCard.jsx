import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';

export default function CourseCard({ course, progress, showProgress = false, onEnroll, enrolling = false }) {
  return (
    <article className="card flex flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/courses/${course._id}`} className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="chip">{course.category}</span>
          <span className="text-xs capitalize text-slate-500">{course.difficulty}</span>
        </div>
        <h3 className="text-lg font-semibold leading-snug">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-slate-500">{course.description}</p>
        <div className="flex flex-wrap gap-1">
          {course.topics?.slice(0, 4).map((t) => (
            <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t}</span>
          ))}
        </div>
        {!showProgress && (
          <div className="mt-auto flex justify-between pt-2 text-xs text-slate-500">
            <span>{course.lessonCount ?? 0} lessons</span>
            <span>{course.enrolled ? '✅ Enrolled' : `${course.enrolledCount || 0} students`}</span>
          </div>
        )}
      </Link>
      {showProgress ? (
        <div className="mt-auto pt-2">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      ) : (
        <Link to={`/courses/${course._id}#quiz`} className="btn-outline text-center">
          Take quiz
        </Link>
      )}
      {onEnroll && (
        <button type="button" className="btn-primary w-full" onClick={onEnroll} disabled={enrolling}>
          {enrolling ? 'Enrolling...' : '＋ Enrol in course'}
        </button>
      )}
    </article>
  );
}
