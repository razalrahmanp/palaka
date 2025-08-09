'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar toggle

  // Check for user and redirect to login if not authenticated
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Mobile view toggles with sidebarOpen */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main content - Full height without header space */}
      <div className="flex-1 relative">
        {/* Floating Header Icons */}
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="h-full p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
