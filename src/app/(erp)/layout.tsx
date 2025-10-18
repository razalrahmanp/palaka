'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Check for user and redirect to login if not authenticated
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar - Always visible, expands on hover */}
      <Sidebar />

      {/* Main content - Always has left margin for sidebar */}
      <div className="flex-1 flex flex-col ml-16 transition-all duration-300">
        {/* Floating Header Icons */}
        <Header onSidebarToggle={() => {}} />
        
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
