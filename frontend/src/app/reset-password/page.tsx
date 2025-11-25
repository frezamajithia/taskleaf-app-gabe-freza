'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
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
          {/* Logo Section */}
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-patina-400 to-patina-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-calendar-days text-white text-2xl"></i>
              </div>
              <h1 className="text-4xl font-bold text-patina-800 ml-4">TaskLeaf</h1>
            </div>
            <p className="text-2xl text-patina-600 font-light">Plan simply. Live calmly.</p>
          </div>

          {/* Hero Illustration */}
          <div className="mb-12 relative">
            <div className="w-64 h-64 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-patina-200/30 to-patina-300/20 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col justify-center items-center h-full gap-4">
                <div className="w-24 h-24 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                  <i className="fa-solid fa-lock text-patina-500 text-4xl"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form Section */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-[480px] flex items-center justify-center p-8 bg-white/30 backdrop-blur-sm"
      >
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
            {!success ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-semibold text-patina-800 mb-2">Reset Password</h2>
                  <p className="text-patina-600">Enter your new password below</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {!token ? (
                  <div className="text-center py-4">
                    <Link href="/forgot-password" className="text-patina-500 hover:text-patina-600 font-medium">
                      Request a new reset link
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-patina-700 mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/70 border border-patina-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-patina-400 focus:border-transparent transition-all text-patina-800 placeholder-patina-400"
                        placeholder="Enter new password"
                        required
                        minLength={8}
                      />
                      <p className="text-xs text-patina-500 mt-1">Must be at least 8 characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-patina-700 mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/70 border border-patina-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-patina-400 focus:border-transparent transition-all text-patina-800 placeholder-patina-400"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-patina-500 hover:bg-patina-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>
                          Resetting...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check"></i>
                          Reset Password
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-green-500 text-3xl"></i>
                </div>
                <h2 className="text-2xl font-semibold text-patina-800 mb-2">Password Reset!</h2>
                <p className="text-patina-600 mb-6">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-patina-500 hover:bg-patina-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-sign-in-alt"></i>
                  Go to Login
                </button>
              </div>
            )}

            {!success && (
              <div className="text-center mt-8">
                <Link href="/login" className="text-patina-500 hover:text-patina-600 font-medium transition-colors duration-200 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-arrow-left"></i>
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gradient-to-br from-patina-50 to-patina-100 items-center justify-center">
        <div className="text-patina-600">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
