'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar open by default
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check for user and redirect to login if not authenticated
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    }
  }, [router]);

  // Click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth >= 768 // Only for desktop (md breakpoint)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - toggles for both mobile and desktop */}
      <div ref={sidebarRef}>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Main content - expands when sidebar is hidden */}
      <div className={`transition-all duration-300 flex-1 relative ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'} w-full`}>
        {/* Floating Header Icons */}
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        {/* Desktop toggle button */}
        <button
          className="hidden md:block absolute top-6 left-4 z-50 bg-white border rounded-full shadow p-2 hover:bg-gray-100"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <main className="h-full p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
