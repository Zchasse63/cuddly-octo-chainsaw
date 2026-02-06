'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Programs', href: '/dashboard/programs', icon: ClipboardList },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-background-primary card-shadow
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-background-tertiary">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Dumbbell className="w-7 h-7 text-accent-blue" />
              <span className="text-lg font-bold">VoiceFit</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden p-1 rounded-lg hover:bg-background-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-colors font-medium
                    ${
                      isActive
                        ? 'bg-accent-blue/10 text-accent-blue'
                        : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-background-tertiary">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary">
              <div className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center text-white font-medium">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">John Doe</p>
                <p className="text-sm text-text-secondary truncate">Coach Pro</p>
              </div>
              <button aria-label="Log out" className="p-2 hover:bg-background-tertiary rounded-lg transition-colors">
                <LogOut className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background-secondary/80 backdrop-blur-lg border-b border-background-tertiary">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
                className="lg:hidden p-2 rounded-lg hover:bg-background-tertiary"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search clients, programs..."
                  className="w-64 pl-10 pr-4 py-2 bg-background-primary rounded-lg border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="View notifications" className="relative p-2 rounded-lg hover:bg-background-tertiary transition-colors">
                <Bell className="w-5 h-5 text-text-secondary" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
