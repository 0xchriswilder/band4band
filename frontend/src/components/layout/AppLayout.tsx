import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-light)]">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 ml-0 md:ml-72">
        {/* Mobile menu button */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 p-3 border-b border-[var(--color-border-light)] bg-white/90 backdrop-blur-sm">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-[var(--color-primary)]/5 text-[var(--color-text-primary)]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-bold text-[var(--color-text-primary)]">Payroll Guard</span>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
