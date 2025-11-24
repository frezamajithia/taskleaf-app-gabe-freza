'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, error, isLoading, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth errors in URL
    const errorParam = searchParams.get('error');
    if (errorParam === 'oauth_failed') {
      setOauthError('Google sign-in failed. Please try again or use email/password.');
    } else if (errorParam === 'missing_params') {
      setOauthError('Authentication incomplete. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    try {
      await register(fullName, email, password);
      router.push('/dashboard');
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-patina-50 to-patina-100">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex flex-col justify-center items-center p-16 relative"
      >
        <div className="max-w-lg text-center relative z-10">
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-patina-400 to-patina-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-calendar-days text-white text-2xl"></i>
              </div>
              <h1 className="text-4xl font-bold text-patina-800 ml-4">TaskLeaf</h1>
            </div>
            <p className="text-2xl text-patina-600 font-light">Plan simply. Live calmly.</p>
          </div>

          <div className="mb-12 relative">
            <div className="w-80 h-80 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-patina-200/30 to-patina-300/20 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-wrap justify-center items-center h-full gap-6">
                <div className="w-24 h-24 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl transform rotate-12 hover:rotate-0 transition-transform">
                  <i className="fa-solid fa-calendar text-patina-500 text-3xl"></i>
                </div>
                <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl transform -rotate-6 hover:rotate-0 transition-transform">
                  <i className="fa-solid fa-list-check text-patina-600 text-2xl"></i>
                </div>
                <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl transform rotate-6 hover:rotate-0 transition-transform">
                  <i className="fa-solid fa-chart-line text-patina-500 text-2xl"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="text-patina-500 italic text-lg font-light">
            &quot;The key is not to prioritize what&apos;s on your schedule, but to schedule your priorities.&quot;
          </div>
        </div>
      </motion.div>

      {/* Register Section */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-[480px] flex items-center justify-center p-8 bg-white/30 backdrop-blur-sm"
      >
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-patina-800 mb-2">Create account</h2>
              <p className="text-patina-600">Join TaskLeaf today</p>
            </div>

            {(error || localError || oauthError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {localError || error || oauthError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-patina-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-patina-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-patina-400 focus:border-transparent transition-all text-patina-800 placeholder-patina-400"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-patina-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-patina-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-patina-400 focus:border-transparent transition-all text-patina-800 placeholder-patina-400"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-patina-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-patina-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-patina-400 focus:border-transparent transition-all text-patina-800 placeholder-patina-400"
                  placeholder="Create a password"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-patina-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-patina-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-patina-400 focus:border-transparent transition-all text-patina-800 placeholder-patina-400"
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-patina-500 hover:bg-patina-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-patina-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-patina-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/google/login`}
                className="w-full bg-white hover:bg-gray-50 text-patina-700 font-semibold py-2.5 rounded-xl border border-patina-200 transition-all shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <i className="fa-brands fa-google text-red-500 mr-2"></i>
                Continue with Google
              </button>
            </form>

            <div className="text-center mt-8">
              <p className="text-patina-600">
                Already have an account?{' '}
                <a href="/login" className="text-patina-500 hover:text-patina-600 font-medium transition-colors duration-200">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gradient-to-br from-patina-50 to-patina-100 items-center justify-center">
        <div className="text-patina-600">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
