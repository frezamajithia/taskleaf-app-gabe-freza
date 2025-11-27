'use client';

import { ReactNode, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarRange,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Sun,
  Moon,
  Menu,
  ChevronLeft,
  Leaf,
  Clock9,
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

interface AppShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  user?: {
    full_name?: string | null;
    email?: string | null;
    profile_picture?: string | null;
  } | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void | Promise<void>;
  actions?: ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: CalendarRange },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Pomodoro', href: '/pomodoro', icon: Clock9 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function AppShell({
  title,
  description,
  children,
  user,
  isDarkMode,
  toggleDarkMode,
  onLogout,
  actions,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials =
    user?.full_name?.split(' ')?.map((n) => n[0]).join('').slice(0, 2) ||
    user?.email?.slice(0, 2)?.toUpperCase() ||
    'U';

  const handleNav = (href: string) => {
    if (pathname === href) return;
    router.push(href);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Collapsible */}
        <aside
          className={cn(
            'fixed md:relative z-50 md:z-auto h-full flex flex-col glass-sidebar transition-all duration-300 ease-in-out',
            // Mobile: slide in/out
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            // Desktop: collapsed or expanded
            sidebarExpanded ? 'w-64' : 'md:w-20'
          )}
        >
          {/* Logo & Toggle */}
          <div className={cn(
            'flex items-center py-5 border-b border-patina-200/20 dark:border-teal-800/20',
            sidebarExpanded ? 'px-5 justify-between' : 'px-0 justify-center'
          )}>
            {sidebarExpanded ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 flex items-center justify-center shadow-lg">
                    <Leaf className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-patina-700 dark:text-teal-200">TaskLeaf</div>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarExpanded(false)}
                  className="p-2 rounded-lg hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="h-5 w-5 text-patina-500 dark:text-teal-400" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarExpanded(true)}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                title="Expand sidebar"
              >
                <Leaf className="h-6 w-6 text-white" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className={cn(
            'py-4 flex-1 overflow-y-auto',
            sidebarExpanded ? 'px-3' : 'px-2'
          )}>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <button
                    key={item.href}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl transition-all duration-200',
                      sidebarExpanded ? 'px-4 py-3' : 'px-0 py-3 justify-center',
                      active
                        ? 'bg-gradient-to-r from-patina-100 to-teal-100 dark:from-teal-800/60 dark:to-teal-700/50 text-patina-700 dark:text-teal-100 shadow-sm'
                        : 'text-patina-600 dark:text-teal-300 hover:bg-patina-50 dark:hover:bg-teal-800/40'
                    )}
                    onClick={() => handleNav(item.href)}
                    title={!sidebarExpanded ? item.label : undefined}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-patina-600 dark:text-teal-200')} />
                    {sidebarExpanded && (
                      <span className={cn('font-medium text-sm', active && 'font-semibold')}>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile Card */}
          <div className={cn(
            'border-t border-patina-200/20 dark:border-teal-800/20 py-4',
            sidebarExpanded ? 'px-3' : 'px-2'
          )}>
            {sidebarExpanded ? (
              <div className="glass-card flex items-center gap-3 px-3 py-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-patina-300 to-teal-400 dark:from-teal-500 dark:to-patina-600 flex items-center justify-center text-white font-semibold text-sm profile-ring flex-shrink-0">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-patina-700 dark:text-teal-200 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-patina-500 dark:text-teal-400 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
                <button
                  className="icon-btn text-patina-500 dark:text-teal-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                  onClick={onLogout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-patina-300 to-teal-400 dark:from-teal-500 dark:to-patina-600 flex items-center justify-center text-white font-semibold text-sm profile-ring">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  className="p-2 rounded-lg text-patina-500 dark:text-teal-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  onClick={onLogout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-20 glass-nav">
            <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                <button
                  className="md:hidden p-2 rounded-xl bg-white/60 dark:bg-teal-800/50 border border-patina-200/50 dark:border-teal-600/40 hover:bg-white/80 dark:hover:bg-teal-700/60 transition-colors"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <Menu className="h-5 w-5 text-patina-600 dark:text-teal-400" />
                </button>

                {/* Desktop Sidebar Toggle (when collapsed) */}
                {!sidebarExpanded && (
                  <button
                    className="hidden md:flex p-2 rounded-xl hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
                    onClick={() => setSidebarExpanded(true)}
                    title="Expand sidebar"
                  >
                    <Menu className="h-5 w-5 text-patina-600 dark:text-teal-400" />
                  </button>
                )}

                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-patina-800 dark:text-teal-100">{title}</h1>
                  {description && (
                    <p className="text-sm text-patina-600 dark:text-teal-300 hidden sm:block">{description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {actions}
                <NotificationBell />
                <button
                  className="icon-btn"
                  onClick={toggleDarkMode}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="h-6 w-px bg-patina-200 dark:bg-teal-800/30 hidden sm:block"></div>
                <div className="hidden sm:flex h-10 w-10 rounded-full bg-gradient-to-br from-patina-300 to-teal-400 dark:from-teal-500 dark:to-patina-600 items-center justify-center text-white font-semibold text-sm profile-ring">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full px-4 py-6 md:px-6 md:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
