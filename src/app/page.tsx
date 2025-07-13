'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      console.log('User:', user);
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      setChecked(true);
    }
  }, [router]);

  return !checked ? <div>Checking auth...</div> : null;
}
