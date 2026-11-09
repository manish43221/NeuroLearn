
import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const menu = [
  {
    title: 'OVERVIEW',
    items: [
      { to: '/dashboard', icon: '◫', label: 'Dashboard' },
    ],
  },
  {
    title: 'LEARNING',
    items: [
      { to: '/courses', icon: '▦', label: 'Explore Courses' },
      { to: '/my-courses', icon: '▣', label: 'My Courses' },
      { to: '/quizzes', icon: '✎', label: 'AI Quizzes' },
      { to: '/flashcards', icon: '▤', label: 'Memory Coach' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { to: '/performance', icon: '⌁', label: 'Performance' },
      { to: '/tutor', icon: '✧', label: 'AI Tutor' },
      { to: '/study-plan', icon: '◷', label: 'Study Plan' },
      { to: '/neurolab', icon: '◎', label: 'NeuroLab' },
    ],
  },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('nl_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle(
      'nl-sidebar-collapsed',
      collapsed
    );

    localStorage.setItem(
      'nl_sidebar_collapsed',
      String(collapsed)
    );

    return () => {
      document.documentElement.classList.remove(
        'nl-sidebar-collapsed'
      );
    };
  }, [collapsed]);

  const search = (e) => {
    e.preventDefault();

    if (q.trim()) {
      navigate(`/courses?search=${encodeURIComponent(q.trim())}`);
    }
  };

  const adminItems = [
    { to: '/manage', icon: '⚙', label: 'Manage' },
    { to: '/students', icon: '♙', label: 'Students' },
  ];

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `nl-nav-link ${isActive ? 'active' : ''}`
      }
    >
      <span className="nl-nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      <span className="nl-nav-indicator" />
    </NavLink>
  );

  return (
    <>
      {/* SIDEBAR */}
      <aside className="nl-sidebar">

        <Link
          to={user ? '/dashboard' : '/'}
          className="nl-brand"
        >
          <span className="nl-brand-icon">N</span>

          <span>
            <strong>NeuroLearn</strong>
            <small>INTELLIGENT LEARNING</small>
          </span>
        </Link>

        {user && (
          <>
            <div className="nl-sidebar-user">
              <div className="nl-avatar">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>

              <div className="min-w-0">
                <strong>{user.name}</strong>
                <small>{user.role || 'Student'}</small>
              </div>

              <span className="nl-online-dot" />
            </div>

            <div className="nl-sidebar-scroll">

              {menu.map((group) => (
                <div
                  className="nl-menu-group"
                  key={group.title}
                >
                  <p className="nl-menu-title">
                    {group.title}
                  </p>

                  <nav className="nl-menu">
                    {group.items.map(renderLink)}
                  </nav>
                </div>
              ))}

              {user.role !== 'student' && (
                <div className="nl-menu-group">
                  <p className="nl-menu-title">
                    ADMINISTRATION
                  </p>

                  <nav className="nl-menu">
                    {adminItems.map(renderLink)}
                  </nav>
                </div>
              )}

            </div>

            <div className="nl-sidebar-bottom">
              <Link
                to="/profile"
                className="nl-profile-link"
                title={collapsed ? 'My Profile' : undefined}
              >
                <span className="nl-profile-icon">♙</span>
                <span>My Profile</span>
              </Link>

              <button
                className="nl-logout"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title={collapsed ? 'Sign out' : undefined}
              >
                <span>↪</span>
                <span>Sign out</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* TOP HEADER */}
      <header className="nl-topbar">

        <div className="nl-topbar-left">

          <button
            type="button"
            className="nl-collapse-btn"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? '☰' : '◧'}
          </button>

          <div className="nl-mobile-brand">
            Neuro<span>Learn</span>
          </div>

          <div className="nl-greeting">
            <strong>
              Hi, {user?.name?.split(' ')[0] || 'Learner'} 👋
            </strong>

            <small>
              Welcome back to your learning space
            </small>
          </div>

        </div>

        <div className="nl-topbar-actions">

          {user && (
            <form
              className="nl-search"
              onSubmit={search}
            >
              <span>⌕</span>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses..."
                aria-label="Search courses"
              />

              <kbd>↵</kbd>
            </form>
          )}

          <button
            type="button"
            className="nl-icon-button"
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀' : '☾'}
          </button>

          {user ? (
            <Link
              to="/profile"
              className="nl-top-profile"
            >
              <span className="nl-top-avatar">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </span>

              <span className="nl-top-profile-name">
                <strong>{user.name}</strong>
                <small>{user.role || 'Student'}</small>
              </span>

              <span className="nl-chevron">⌄</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-outline">
                Login
              </Link>

              <Link to="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}

        </div>
      </header>
    </>
  );
}
