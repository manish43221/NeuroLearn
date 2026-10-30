import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const linkClass = ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'text-slate-600 hover:text-brand-600 dark:text-slate-400'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const search = (e) => {
    e.preventDefault();
    navigate(`/courses?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-3">
        <Link to={user ? '/dashboard' : '/'} className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          <img src="/neurolearn-mark.svg" alt="" className="h-9 w-9 rounded-xl shadow-sm shadow-blue-900/20" />
          <span>Neuro<span className="text-brand-600 dark:text-brand-400">Learn</span></span>
        </Link>

        {user && (
          <nav className="hidden shrink-0 items-center gap-1 2xl:flex">
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/courses" className={linkClass}>Courses</NavLink>
            <NavLink to="/my-courses" className={linkClass}>My Courses</NavLink>
            <NavLink to="/quizzes" className={linkClass}>Quizzes</NavLink>
            <NavLink to="/performance" className={linkClass}>Performance</NavLink>
            <NavLink to="/tutor" className={linkClass}>AI Tutor</NavLink>
            <NavLink to="/study-plan" className={linkClass}>Study Plan</NavLink>
            <NavLink to="/flashcards" className={linkClass}>Flashcards</NavLink>
            {user.role !== 'student' && <NavLink to="/manage" className={linkClass}>Manage</NavLink>}
            {user.role !== 'student' && <NavLink to="/students" className={linkClass}>Students</NavLink>}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <form onSubmit={search} className="hidden 2xl:block">
              <input className="input w-36 !py-1.5" placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <Link to="/profile" title="Profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {user.name[0].toUpperCase()}
              </Link>
              <button className="btn-outline !py-1.5" onClick={() => { logout(); navigate('/'); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline !py-1.5">Login</Link>
              <Link to="/register" className="btn-primary !py-1.5">Get started</Link>
            </>
          )}
        </div>
      </div>

      {user && (
        <nav className="mx-auto flex w-full max-w-[1500px] flex-wrap gap-1 border-t border-slate-100 px-4 py-2 2xl:hidden dark:border-slate-800">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/courses" className={linkClass}>Courses</NavLink>
          <NavLink to="/my-courses" className={linkClass}>My Courses</NavLink>
          <NavLink to="/quizzes" className={linkClass}>Quizzes</NavLink>
          <NavLink to="/performance" className={linkClass}>Performance</NavLink>
          <NavLink to="/tutor" className={linkClass}>AI Tutor</NavLink>
          <NavLink to="/study-plan" className={linkClass}>Study Plan</NavLink>
          <NavLink to="/flashcards" className={linkClass}>Flashcards</NavLink>
          {user.role !== 'student' && <NavLink to="/manage" className={linkClass}>Manage</NavLink>}
          {user.role !== 'student' && <NavLink to="/students" className={linkClass}>Students</NavLink>}
        </nav>
      )}
    </header>
  );
}