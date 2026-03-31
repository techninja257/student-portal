import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/admin', label: 'OVERVIEW', icon: 'dashboard', exact: true },
  { to: '/admin/students', label: 'STUDENTS', icon: 'groups' },
  { to: '/admin/results', label: 'RESULTS', icon: 'analytics' },
  { to: '/admin/departments', label: 'DEPARTMENTS', icon: 'account_balance' },
  { to: '/admin/levels', label: 'LEVELS', icon: 'layers' },
  { to: '/admin/semesters', label: 'SEMESTERS', icon: 'calendar_month' },
];

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/results': 'Results',
  '/admin/departments': 'Departments',
  '/admin/levels': 'Levels',
  '/admin/semesters': 'Semesters',
};

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  const pageTitle = pageTitles[pathname] || 'Admin';

  return (
    <div className="min-h-screen bg-surface flex font-body">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-surface-low flex flex-col z-20">
        {/* Brand */}
        <div className="px-6 pt-8 pb-6">
          <h1 className="font-headline font-bold text-xl text-primary">Student Portal</h1>
          <p className="text-[10px] uppercase tracking-widest text-outline mt-0.5">Admin Panel</p>
        </div>
        {/* Nav */}
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
      <header className="fixed top-0 left-64 right-0 z-10 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border-b border-outline-variant/10 flex items-center justify-between px-8">
        <h2 className="font-headline font-bold text-lg text-on-surface">{pageTitle}</h2>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{initials(user?.name)}</span>
          </div>
          <span className="text-sm font-medium text-on-surface-variant">{user?.name}</span>
          <button
            onClick={handleLogout}
            title="Logout"
            className="ml-1 flex items-center justify-center w-8 h-8 rounded-full hover:bg-error/10 text-error transition"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="ml-64 pt-28 px-12 pb-8 flex-1 min-h-screen bg-surface">
        {children}
      </main>
    </div>
  );
}
