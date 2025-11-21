'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadUser } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get token and user from URL parameters
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

        if (!token || !userStr) {
          console.error('Missing token or user data in callback');
          router.push('/login?error=oauth_failed');
          return;
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userStr));

        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update auth store
        await loadUser();

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        router.push('/login?error=oauth_failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, loadUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-patina-50 via-white to-patina-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-patina-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-patina-700">Completing sign in...</h2>
        <p className="text-sm text-patina-600 mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-patina-50 via-white to-patina-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-patina-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-patina-700">Loading...</h2>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
