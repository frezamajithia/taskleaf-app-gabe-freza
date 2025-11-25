'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [oauthOnly, setOauthOnly] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDevResetUrl(null);
    setOauthOnly(false);

    try {
      const response = await api.post('/auth/forgot-password', { email });

      // Check if dev mode returned a reset URL
      if (response.data.dev_mode && response.data.reset_url) {
        setDevResetUrl(response.data.reset_url);
      } else if (response.data.dev_mode && response.data.oauth_only) {
        setOauthOnly(true);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
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
                  <i className="fa-solid fa-key text-patina-500 text-4xl"></i>
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
            {!submitted ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-semibold text-patina-800 mb-2">Forgot Password?</h2>
                  <p className="text-patina-600">Enter your email and we&apos;ll send you a reset link</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-patina-500 hover:bg-patina-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        Send Reset Link
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                {oauthOnly ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <i className="fa-brands fa-google text-blue-500 text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-semibold text-patina-800 mb-2">Google Account</h2>
                    <p className="text-patina-600 mb-6">
                      This account uses Google Sign-In and doesn&apos;t have a password. Please use &quot;Continue with Google&quot; to log in.
                    </p>
                  </>
                ) : devResetUrl ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-code text-amber-600 text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-semibold text-patina-800 mb-2">Dev Mode</h2>
                    <p className="text-patina-600 mb-4">
                      Reset link generated for <span className="font-medium">{email}</span>
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <p className="text-xs text-amber-700 mb-2 font-medium">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                        Development Only - Not shown in production
                      </p>
                      <a
                        href={devResetUrl}
                        className="text-sm text-patina-600 hover:text-patina-700 underline break-all"
                      >
                        Click here to reset password
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-check text-green-500 text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-semibold text-patina-800 mb-2">Check your email</h2>
                    <p className="text-patina-600 mb-6">
                      If an account exists with <span className="font-medium">{email}</span>, you&apos;ll receive a password reset link shortly.
                    </p>
                    <p className="text-sm text-patina-500 mb-4">
                      <i className="fa-solid fa-info-circle mr-1"></i>
                      Check your spam folder if you don&apos;t see it.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="text-center mt-8">
              <Link href="/login" className="text-patina-500 hover:text-patina-600 font-medium transition-colors duration-200 flex items-center justify-center gap-2">
                <i className="fa-solid fa-arrow-left"></i>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
