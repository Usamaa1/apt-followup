import { NavLink, Outlet } from 'react-router-dom';
import {
  Table2,
  Users,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardShell() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/followup', label: 'Follow-Up Sheet', icon: Table2 },
    { to: '/manage-batches', label: 'Batches & Students', icon: Users },
    { to: '/import-export', label: 'Excel Import / Export', icon: FileSpreadsheet },
    { to: '/settings', label: 'Sheet & WhatsApp Settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin Directory', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Minimal Workspace Header */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="font-semibold text-sm text-slate-900 tracking-tight">
              Follow-Up Portal
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-slate-800">{user?.displayName || user?.name}</p>
            <p className="text-[11px] text-slate-400 uppercase">{user?.role}</p>
          </div>
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-slate-200"
            />
          )}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}