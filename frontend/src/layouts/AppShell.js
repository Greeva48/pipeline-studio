import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../app.css';

// Friendly, user-facing workspace label derived from the signed-in user.
// Never exposes the workspace UUID.
function workspaceLabel(user) {
  const raw = (user?.name || user?.email?.split('@')[0] || '').trim();
  const first = raw.split(/\s+/)[0];
  if (first) return `${first.charAt(0).toUpperCase()}${first.slice(1)}'s Workspace`;
  return 'Personal Workspace';
}

/* ── Icons ────────────────────────────────────────────────── */
const icons = {
  dashboard: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="7.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  projects: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 3.5h12M1 7h12M1 10.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  studio: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="4.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="9.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 7h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  deployments: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 5l3-4 3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 11h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  validation: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  blocks: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 10.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.64 2.64l1.06 1.06M10.3 10.3l1.06 1.06M11.36 2.64l-1.06 1.06M3.7 10.3l-1.06 1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  external: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M4 2H2a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1V6M7 1h2v2M9 1L5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  signout: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5M9 4l3 3-3 3M13 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  workspace: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
      <path d="M6 1L1 4v6h10V4L6 1z"/>
    </svg>
  ),
};

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',   icon: 'dashboard' },
  { to: '/projects',    label: 'Projects',     icon: 'projects' },
];

const toolItems = [
  { to: '/studio',      label: 'Studio',       icon: 'studio',      external: true },
];

const systemItems = [
  { to: '/deployments', label: 'Deployments',  icon: 'deployments' },
  { to: '/validation',  label: 'Validation',   icon: 'validation' },
  { to: '/blocks',      label: 'Blocks',        icon: 'blocks' },
];

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/signin');
  };

  return (
    <div className="ps-app">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="ps-sidebar">

        {/* Workspace selector */}
        <div className="ps-sidebar__workspace">
          <div className="ps-sidebar__workspace-dot">
            {icons.workspace}
          </div>
          <span className="ps-sidebar__workspace-name" title={workspaceLabel(user)}>
            {workspaceLabel(user)}
          </span>
          <span className="ps-sidebar__workspace-caret">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </span>
        </div>

        {/* Navigation */}
        <nav className="ps-nav">

          <div className="ps-nav__section">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `ps-nav__item${isActive ? ' ps-nav__item--active' : ''}`
                }
              >
                <span className="ps-nav__item-icon">{icons[item.icon]}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="ps-nav__sep" />

          <div className="ps-nav__section">
            {toolItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `ps-nav__item${isActive ? ' ps-nav__item--active' : ''}`
                }
              >
                <span className="ps-nav__item-icon">{icons[item.icon]}</span>
                {item.label}
                <span className="ps-nav__item-external">{icons.external}</span>
              </NavLink>
            ))}
          </div>

          <div className="ps-nav__sep" />

          <div className="ps-nav__section">
            {systemItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `ps-nav__item${isActive ? ' ps-nav__item--active' : ''}`
                }
              >
                <span className="ps-nav__item-icon">{icons[item.icon]}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="ps-nav__sep" />

          <div className="ps-nav__section">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `ps-nav__item${isActive ? ' ps-nav__item--active' : ''}`
              }
            >
              <span className="ps-nav__item-icon">{icons.settings}</span>
              Settings
            </NavLink>
          </div>

        </nav>

        {/* User section */}
        <div className="ps-sidebar__user">
          <div className="ps-sidebar__avatar">
            {user?.initials ?? 'U'}
          </div>
          <div className="ps-sidebar__user-info">
            <span className="ps-sidebar__user-name">{user?.name ?? 'User'}</span>
            <span className="ps-sidebar__user-email">{user?.email ?? ''}</span>
          </div>
          <button
            className="ps-sidebar__signout"
            onClick={handleSignOut}
            title="Sign out"
          >
            {icons.signout}
          </button>
        </div>

      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="ps-main">
        <Outlet />
      </main>

    </div>
  );
}
