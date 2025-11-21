'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { AppShell } from '@/components/layout/AppShell';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const { isDarkMode, setDarkMode, toggleDarkMode, initializeTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    taskReminders: true,
    weeklyDigest: false,
    defaultView: 'month',
    startOfWeek: 'sunday',
  });

  // Save states
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    initializeTheme();
    loadUser();
  }, [initializeTheme, loadUser]);

  useEffect(() => {
    // Don't redirect while still loading user data
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setSaveMessage('');

    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  const handlePreferencesSave = async () => {
    setSaving(true);
    setSaveMessage('');

    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppShell
      title="Settings"
      description="Manage your account and preferences"
      user={user}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
    >
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-patina-200/30 dark:border-teal-700/30 mb-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 font-medium transition-all ${
              activeTab === 'profile'
                ? 'text-patina-700 dark:text-teal-200 border-b-2 border-patina-500 dark:border-teal-400'
                : 'text-patina-600 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-200'
            }`}
          >
            <i className="fa-solid fa-user mr-2"></i>
            Profile
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 font-medium transition-all ${
              activeTab === 'preferences'
                ? 'text-patina-700 dark:text-teal-200 border-b-2 border-patina-500 dark:border-teal-400'
                : 'text-patina-600 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-200'
            }`}
          >
            <i className="fa-solid fa-sliders mr-2"></i>
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 font-medium transition-all ${
              activeTab === 'security'
                ? 'text-patina-700 dark:text-teal-200 border-b-2 border-patina-500 dark:border-teal-400'
                : 'text-patina-600 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-200'
            }`}
          >
            <i className="fa-solid fa-shield mr-2"></i>
            Security
          </button>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-xl text-green-700 dark:text-green-400 flex items-center gap-2">
            <i className="fa-solid fa-check-circle"></i>
            {saveMessage}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-6">Profile Information</h3>

              {/* Profile Picture */}
              <div className="mb-8 flex items-center gap-6">
                <Image
                  src={user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=609A93&color=fff`}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                />
                <div>
                  <h4 className="font-semibold text-patina-700 dark:text-teal-200 mb-2">Profile Picture</h4>
                  <p className="text-sm text-patina-600 dark:text-teal-400 mb-3">
                    {user?.profile_picture ? 'Synced from Google' : 'Default avatar'}
                  </p>
                  {!user?.profile_picture && (
                    <button className="btn-secondary px-4 py-2 rounded-xl text-sm">
                      Upload Photo
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                    placeholder="your.email@example.com"
                    disabled={!!user?.google_id}
                  />
                  {user?.google_id && (
                    <p className="text-xs text-patina-600 dark:text-teal-400 mt-2">
                      <i className="fa-brands fa-google mr-1"></i>
                      Managed by Google Sign-In
                    </p>
                  )}
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-2">
                    Account Type
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-patina-100/60 dark:!bg-teal-800/40 border border-patina-200/50 dark:border-teal-600/50 text-patina-800 dark:!text-teal-100 font-medium">
                    {user?.google_id ? (
                      <span>
                        <i className="fa-brands fa-google mr-2 text-patina-600 dark:text-teal-300"></i>
                        Google Account
                      </span>
                    ) : (
                      <span>
                        <i className="fa-solid fa-envelope mr-2 text-patina-600 dark:text-teal-300"></i>
                        Email & Password
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="btn-primary px-6 py-3 rounded-xl disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save mr-2"></i>
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={() => setProfileForm({ full_name: user?.full_name || '', email: user?.email || '' })}
                  className="btn-secondary px-6 py-3 rounded-xl"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <i className="fa-solid fa-info-circle mr-2"></i>
                  Settings changes are currently saved locally. Full backend integration coming soon!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Notifications */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-6">Notifications</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="font-medium text-patina-700 dark:text-teal-200">Email Notifications</h4>
                    <p className="text-sm text-patina-600 dark:text-teal-400">Receive email updates about your tasks</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, emailNotifications: !preferences.emailNotifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.emailNotifications ? 'bg-patina-500 dark:bg-teal-500' : 'bg-patina-200 dark:bg-teal-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="font-medium text-patina-700 dark:text-teal-200">Task Reminders</h4>
                    <p className="text-sm text-patina-600 dark:text-teal-400">Get notified about upcoming deadlines</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, taskReminders: !preferences.taskReminders })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.taskReminders ? 'bg-patina-500 dark:bg-teal-500' : 'bg-patina-200 dark:bg-teal-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.taskReminders ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="font-medium text-patina-700 dark:text-teal-200">Weekly Digest</h4>
                    <p className="text-sm text-patina-600 dark:text-teal-400">Receive a summary of your week every Sunday</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, weeklyDigest: !preferences.weeklyDigest })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.weeklyDigest ? 'bg-patina-500 dark:bg-teal-500' : 'bg-patina-200 dark:bg-teal-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.weeklyDigest ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Settings */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-6">Calendar Settings</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-3">
                    Default Calendar View
                  </label>
                  <select
                    value={preferences.defaultView}
                    onChange={(e) => setPreferences({ ...preferences, defaultView: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                  >
                    <option value="day">Day View</option>
                    <option value="week">Week View</option>
                    <option value="month">Month View</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-3">
                    Start of Week
                  </label>
                  <select
                    value={preferences.startOfWeek}
                    onChange={(e) => setPreferences({ ...preferences, startOfWeek: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                    <option value="saturday">Saturday</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-6">Appearance</h3>
              <div>
                <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDarkMode(false)}
                    className={`px-6 py-4 rounded-xl border-2 transition-all ${
                      !isDarkMode
                        ? 'border-patina-500 dark:border-teal-500 bg-patina-50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 font-medium'
                        : 'border-patina-200/30 dark:border-teal-700/30 text-patina-600 dark:text-teal-400 hover:border-patina-300 dark:hover:border-teal-600'
                    }`}
                  >
                    <i className="fa-solid fa-sun mr-2"></i>
                    Light
                  </button>
                  <button
                    onClick={() => setDarkMode(true)}
                    className={`px-6 py-4 rounded-xl border-2 transition-all ${
                      isDarkMode
                        ? 'border-patina-500 dark:border-teal-500 bg-patina-50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 font-medium'
                        : 'border-patina-200/30 dark:border-teal-700/30 text-patina-600 dark:text-teal-400 hover:border-patina-300 dark:hover:border-teal-600'
                    }`}
                  >
                    <i className="fa-solid fa-moon mr-2"></i>
                    Dark
                  </button>
                </div>
                <p className="text-xs text-patina-600 dark:text-teal-400 mt-3">
                  Theme changes are saved automatically and persist across sessions.
                </p>
              </div>
            </div>

            <button
              onClick={handlePreferencesSave}
              disabled={saving}
              className="btn-primary px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save mr-2"></i>
                  Save Preferences
                </>
              )}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password (only for non-OAuth users) */}
            {!user?.google_id && (
              <div className="glass-card rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-6">Change Password</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-patina-700 dark:text-teal-200 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button className="btn-primary px-6 py-3 rounded-xl">
                    <i className="fa-solid fa-lock mr-2"></i>
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {/* Connected Accounts */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-6">Connected Accounts</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-patina-50/50 dark:!bg-teal-800/50 rounded-xl border border-patina-200/30 dark:border-teal-600/60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <i className="fa-brands fa-google text-white text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-patina-700 dark:text-teal-200">Google</h4>
                      <p className="text-sm text-patina-600 dark:text-teal-400">
                        {user?.google_id ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {user?.google_id ? (
                    <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                      <i className="fa-solid fa-check mr-1"></i>
                      Active
                    </span>
                  ) : (
                    <button className="btn-secondary px-4 py-2 rounded-xl text-sm">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="glass-card rounded-2xl p-8 border-red-200/50 dark:border-red-700/50">
              <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6">Danger Zone</h3>
              <div className="space-y-4">
                <div className="p-5 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Delete Account</h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button className="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-red-500/30">
                    <i className="fa-solid fa-trash mr-2"></i>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
