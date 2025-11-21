'use client';

import { ReactNode } from 'react';
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
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { notificationsMock } from '@/lib/notifications';
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

  const initials =
    user?.full_name?.split(' ')?.map((n) => n[0]).join('').slice(0, 2) ||
    user?.email?.slice(0, 2)?.toUpperCase() ||
    'U';

  const handleNav = (href: string) => {
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <div className="min-h-screen">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col glass-sidebar">
          {/* Logo */}
          <div className="px-6 py-6">
            <div className="text-2xl font-semibold text-patina-700 dark:text-teal-200">TaskLeaf</div>
            <p className="text-sm text-patina-600 dark:text-teal-400 mt-1">Stay in flow</p>
          </div>

          {/* Navigation */}
          <div className="px-3 pb-4 flex-1 overflow-y-auto">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <button
                    key={item.href}
                    className={cn(
                      'sidebar-item w-full text-base',
                      active && 'sidebar-item-active'
                    )}
                    onClick={() => handleNav(item.href)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile Card */}
          <div className="border-t border-patina-200/30 dark:border-teal-800/20 px-4 py-4">
            <div className="glass-card flex items-center gap-3 px-3 py-3">
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-patina-700 dark:text-teal-200 truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-patina-500 dark:text-teal-400 truncate max-w-[150px]">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
              <button
                className="icon-btn text-patina-500 dark:text-teal-400 hover:text-red-500 dark:hover:text-red-400"
                onClick={onLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-20 glass-nav">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 md:px-8">
              <div>
                <h1 className="text-2xl font-semibold text-patina-800 dark:text-teal-100">{title}</h1>
                {description && (
                  <p className="text-sm text-patina-600 dark:text-teal-300">{description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {actions}
                <NotificationBell notifications={notificationsMock} />
                <button
                  className="icon-btn"
                  onClick={toggleDarkMode}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="h-6 w-px bg-patina-200 dark:bg-teal-800/30"></div>
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
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
