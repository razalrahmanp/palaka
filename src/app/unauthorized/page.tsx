'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  // useEffect(() => { 
  //   const user = localStorage.getItem('user');
  //   if (!user) {
  //     router.replace('/login');
  //   }
  // }, [router]);
useEffect(() => {
  router.replace('/login');
}, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-3xl font-bold text-red-600">403 - Unauthorized</h1>
      <p className="text-gray-600 mt-2">You don’t have permission to access this page.</p>
      <p className="text-sm mt-4">Redirecting to login...</p>
    </div>
  );
}

