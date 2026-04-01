import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const navLinks = [
  { to: '/student', label: 'OVERVIEW', icon: 'dashboard', exact: true },
];

const bottomNavLinks = [
  { to: '/student', label: 'Dashboard', icon: 'home', exact: true },
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function StudentLayout({ children }) {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Sync profile_image_url into auth context if not yet present
  useEffect(() => {
    if (user && !user.profile_image_url) {
      api.get('/student/me').then(({ data }) => {
        if (data.profile_image_url) {
          updateUser({ profile_image_url: data.profile_image_url });
        }
      }).catch(() => {});
    }
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-surface flex font-body">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-surface-low flex-col z-20">
        <div className="px-6 pt-8 pb-6">
          <h1 className="font-headline font-bold text-xl text-primary">Student Portal</h1>
          <p className="text-[10px] uppercase tracking-widest text-outline mt-0.5">Student Panel</p>
        </div>
        <nav className="flex-1 space-y-0.5 pr-0">
          {navLinks.map(({ to, label, icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 py-3 text-[11px] font-semibold tracking-widest transition-all ${
                  active
                    ? 'bg-white rounded-l-full ml-4 pl-4 pr-6 shadow-sm text-primary'
                    : 'px-8 text-outline hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 left-0 lg:left-64 right-0 z-10 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border-b border-outline-variant/10 flex items-center justify-between px-4 lg:px-8">
        {/* Mobile: brand text only */}
        <h1 className="lg:hidden font-headline font-bold text-base text-primary">Student Portal</h1>
        {/* Desktop: page title */}
        <h2 className="hidden lg:block font-headline font-bold text-lg text-on-surface">My Dashboard</h2>

        <div className="flex items-center gap-3">
          {/* Avatar — always visible */}
          {user?.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{initials(user?.name)}</span>
            </div>
          )}
          {/* Name + logout — desktop only */}
          <span className="hidden lg:block text-sm font-medium text-on-surface-variant">{user?.name}</span>
          <button
            onClick={handleLogout}
            title="Logout"
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full hover:bg-error/10 text-error transition"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      <main className="ml-0 lg:ml-64 px-4 pt-24 pb-24 lg:pt-28 lg:px-12 lg:pb-8 flex-1 min-h-screen bg-surface">
        {children}
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#bdc9c8]/20 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] flex items-center justify-around px-4 h-16">
        {bottomNavLinks.map(({ to, label, icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[64px]"
            >
              <span
                className={`material-symbols-outlined text-[24px] transition-colors ${active ? 'text-[#006565]' : 'text-[#6e7979]'}`}
              >
                {icon}
              </span>
              <span className={`text-[10px] uppercase tracking-wider font-semibold transition-colors ${active ? 'text-[#006565]' : 'text-[#6e7979]'}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 py-2 px-4 min-w-[64px]"
        >
          <span className="material-symbols-outlined text-[24px] text-[#ba1a1a]">logout</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ba1a1a]">Logout</span>
        </button>
      </nav>
    </div>
  );
}
