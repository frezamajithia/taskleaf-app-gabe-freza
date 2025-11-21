'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to login page
    router.push('/login');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-patina-50 to-patina-100 flex items-center justify-center">
      <div className="text-patina-600">Loading...</div>
    </div>
  );
}
