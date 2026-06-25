import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  Activity,
  AlertTriangle,
  FileText,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Wrench,
  Zap,
  Gauge,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'from-violet-400 to-indigo-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
  { to: '/clients', icon: Users, label: 'Clientes', color: 'from-blue-400 to-cyan-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
  { to: '/vehicles', icon: Car, label: 'Vehículos', color: 'from-emerald-400 to-teal-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
  { to: '/diagnostics', icon: Activity, label: 'Diagnósticos', color: 'from-amber-400 to-orange-400', roles: ['Administrador', 'Técnico'] },
  { to: '/obd', icon: Wrench, label: 'OBD-II', color: 'from-rose-400 to-pink-400', roles: ['Administrador', 'Técnico'] },
  { to: '/dtc', icon: Zap, label: 'Códigos DTC', color: 'from-yellow-400 to-amber-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
  { to: '/alerts', icon: AlertTriangle, label: 'Alertas', color: 'from-red-400 to-rose-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
  { to: '/reports', icon: FileText, label: 'Reportes', color: 'from-sky-400 to-blue-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
  { to: '/history', icon: ClipboardList, label: 'Historial', color: 'from-purple-400 to-violet-400', roles: ['Administrador', 'Técnico', 'Supervisor'] },
];

function UserAvatar({ name, collapsed }: { name: string; collapsed: boolean }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (collapsed) {
    return (
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-br from-dark-200 to-dark-300 p-3 ring-1 ring-white/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-gray-500">En línea</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = navItems.filter(
    (item) => user && item.roles.includes(user.role.name)
  );

  const sidebarContent = (
    <div
      className={clsx(
        'flex h-full flex-col bg-[#0a0a16]/80 backdrop-blur-sm border-r border-white/[0.04] transition-all duration-300',
        collapsed ? 'w-16' : 'w-64 max-w-[85vw]'
      )}
    >
      {/* Logo */}
      <div className="relative flex h-16 items-center justify-between border-b border-white/[0.06] px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-violet-500/5" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 blur-md" />
            <img src="/spider.svg" alt="SpiderDiag" className="relative h-8 w-8 drop-shadow-lg" />
          </div>
          {!collapsed && (
            <div className="relative">
              <span className="text-lg font-black tracking-tight">
                <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Spider
                </span>
                <span className="text-white/90">Diag</span>
              </span>
              <div className="mt-0.5 h-0.5 w-full rounded-full bg-gradient-to-r from-violet-500/60 via-indigo-500/60 to-purple-500/60" />
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="relative hidden rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-gray-300 lg:block transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Menú principal
          </p>
        )}

        {items.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/15 to-violet-500/10 ring-1 ring-inset ring-white/[0.06]" />
                )}
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-indigo-400" />
                )}
                <span className={clsx(
                  'relative z-10 transition-transform duration-200 group-hover:scale-110',
                  isActive && 'drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]'
                )}>
                  <item.icon size={20} />
                </span>
                {!collapsed && (
                  <span className="relative z-10">{item.label}</span>
                )}
                {!collapsed && isActive && (
                  <span className="relative z-10 ml-auto flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {!collapsed && (
          <>
            <div className="my-3 border-t border-white/[0.04]" />
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Sistema
            </p>
          </>
        )}

        {/* Quick stats */}
        {!collapsed && (
          <div className="mx-2 mt-2 rounded-xl bg-gradient-to-br from-dark-300/50 to-dark-200/50 p-3 ring-1 ring-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Estado del sistema</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(0,230,118,0.5)]" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Gauge size={16} className="text-indigo-400" />
              <span className="text-xs font-medium text-gray-400">v1.0.0</span>
            </div>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] p-3">
        {user && <UserAvatar name={user.full_name} collapsed={collapsed} />}
        {!collapsed && user && (
          <span className="mb-2 inline-block rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            {user.role.name}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-3 z-50 rounded-xl border border-white/[0.06] bg-[#0c0c18] p-2.5 text-gray-400 shadow-lg lg:hidden"
      >
        <Menu size={22} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block">{sidebarContent}</aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-full lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
