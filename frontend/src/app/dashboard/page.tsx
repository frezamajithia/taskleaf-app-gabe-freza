'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const loadUser = useAuthStore((state) => state.loadUser);
  const { isDarkMode, toggleDarkMode, initializeTheme } = useThemeStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customWeather, setCustomWeather] = useState<any>(null);
  const [weatherLocation, setWeatherLocation] = useState('');
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/tasks/stats/summary')
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeTheme();
    loadUser(); // Load user from localStorage
    fetchDashboardData();
  }, [initializeTheme, loadUser, fetchDashboardData]);

  const toggleTaskComplete = async (taskId: number, completed: boolean) => {
    try {
      await api.put(`/tasks/${taskId}`, { completed: !completed });
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const fetchCustomWeather = async (location: string) => {
    if (!location.trim()) return;

    setFetchingWeather(true);
    try {
      // Create a temporary task with location to get weather
      const response = await api.post('/tasks/', {
        title: '_temp_weather_check',
        description: 'Temporary task for weather lookup',
        date: new Date().toISOString().split('T')[0],
        priority: 'low',
        location: location.trim(),
        _temp: true
      });

      if (response.data.weather_data) {
        setCustomWeather(response.data.weather_data);
      }

      // Delete the temporary task
      await api.delete(`/tasks/${response.data.id}`);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      alert('Could not fetch weather for this location. Please try again.');
    } finally {
      setFetchingWeather(false);
    }
  };

  const handleWeatherSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (weatherLocation.trim()) {
      fetchCustomWeather(weatherLocation);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getCurrentDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todaysTasks = tasks.filter(task => {
    // Parse date in local timezone by adding time component
    const [year, month, day] = task.date.split('-');
    const taskDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
  });

  const completedToday = todaysTasks.filter(t => t.completed).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-patina-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-patina-200 dark:border-teal-800 border-t-patina-500 dark:border-t-teal-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fa-solid fa-leaf text-patina-500 dark:text-teal-400 text-lg animate-pulse"></i>
            </div>
          </div>
          <p className="text-patina-600 dark:text-teal-400 font-medium animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'User';

  return (
    <AppShell
      title={`${getGreeting()}, ${firstName}`}
      description={getCurrentDate()}
      user={user}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-200 mb-6">Quick Add</h3>
              <div className="border-t border-patina-200/30 dark:border-teal-700/30 pt-6">
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push('/tasks/new')}
                    className="btn-primary flex items-center px-6 py-3 rounded-xl hover:scale-105 hover:shadow-lg hover:shadow-patina-500/30 dark:hover:shadow-teal-500/30 transition-all duration-200"
                  >
                    <i className="fa-solid fa-plus mr-3"></i>
                    Add Task
                  </button>
                  <button
                    onClick={() => router.push('/calendar')}
                    className="btn-secondary flex items-center px-6 py-3 rounded-xl hover:scale-105 transition-all duration-200"
                  >
                    <i className="fa-solid fa-calendar mr-3"></i>
                    Add Event
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-200 mb-6">Today&apos;s Schedule</h3>
              <div className="border-t border-patina-200/30 dark:border-teal-700/30 pt-6">
                {todaysTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fa-regular fa-calendar-check text-3xl text-patina-300 dark:text-teal-600 mb-3"></i>
                    <p className="text-patina-600 dark:text-teal-400 opacity-70">No tasks scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysTasks.slice(0, 3).map((task, index) => (
                      <div
                        key={task.id}
                        className="group flex items-center py-4 px-5 rounded-xl border border-patina-200/30 dark:border-teal-700/30 hover:border-patina-300/50 dark:hover:border-teal-600/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className={`w-3 h-3 rounded-full mr-4 transition-transform group-hover:scale-125 ${
                          task.priority === 'high' ? 'bg-red-400 shadow-sm shadow-red-400/50' :
                          task.priority === 'medium' ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-green-400 shadow-sm shadow-green-400/50'
                        }`}></div>
                        <div className="flex-1">
                          <h4 className="font-medium text-patina-700 dark:text-teal-200">{task.title}</h4>
                          <p className="text-sm text-patina-600 dark:text-teal-400 opacity-70 mt-1">
                            {task.time ? (() => {
                              const [hours, minutes] = task.time.split(':');
                              const hour = parseInt(hours);
                              const ampm = hour >= 12 ? 'PM' : 'AM';
                              const displayHour = hour % 12 || 12;
                              return `${displayHour}:${minutes} ${ampm}`;
                            })() : 'All day'}
                          </p>
                        </div>
                        <span className="px-3 py-1.5 text-xs rounded-lg bg-patina-100/60 dark:bg-teal-900/70 text-patina-700 dark:text-teal-100 font-medium">
                          {index === 0 ? 'Upcoming' : 'Later'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Today's Tasks Preview */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-200 flex items-center">
                  Today&apos;s Tasks
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="w-32 h-2 bg-patina-100/50 dark:bg-teal-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-patina-400 to-teal-500 dark:from-teal-400 dark:to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${todaysTasks.length > 0 ? (completedToday / todaysTasks.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-patina-600 dark:text-teal-300">
                    {completedToday}/{todaysTasks.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {todaysTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-patina-100 to-teal-100 dark:from-teal-900/50 dark:to-teal-800/30 flex items-center justify-center">
                      <i className="fa-solid fa-check-circle text-2xl text-patina-400 dark:text-teal-500"></i>
                    </div>
                    <p className="text-patina-600 dark:text-teal-400 font-medium">No tasks for today</p>
                    <p className="text-sm text-patina-500 dark:text-teal-500 mt-1">Enjoy your free time!</p>
                  </div>
                ) : (
                  todaysTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="group flex items-center space-x-4 p-4 rounded-xl border border-patina-200/30 dark:border-teal-700/30 hover:border-patina-300/50 dark:hover:border-teal-600/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${index * 75}ms` }}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTaskComplete(task.id, task.completed)}
                        className="custom-checkbox flex-shrink-0"
                      />
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-150 ${
                        task.priority === 'high' ? 'bg-red-500 shadow-sm shadow-red-500/50' :
                        task.priority === 'medium' ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-green-500 shadow-sm shadow-green-500/50'
                      }`}></div>
                      <span className={`flex-1 ${task.completed ? 'text-patina-500 dark:text-teal-500 line-through opacity-70' : 'text-patina-700 dark:text-teal-200'}`}>
                        {task.title}
                      </span>
                      {task.priority === 'high' && !task.completed && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">High Priority</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">

            {/* Weather Card */}
            <div className="glass-card rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-200">Weather</h3>
                <i className="fa-solid fa-cloud-sun text-patina-400 dark:text-teal-400 text-2xl"></i>
              </div>

              {/* Location Search */}
              <form onSubmit={handleWeatherSearch} className="mb-6">
                <div className="relative">
                  <i className="fa-solid fa-location-dot absolute left-3 top-1/2 transform -translate-y-1/2 text-patina-400 dark:text-teal-400 text-xs"></i>
                  <input
                    type="text"
                    value={weatherLocation}
                    onChange={(e) => setWeatherLocation(e.target.value)}
                    placeholder="Search location..."
                    className="w-full pl-9 pr-20 py-2 text-xs rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={fetchingWeather || !weatherLocation.trim()}
                    className="absolute right-1.5 top-1/2 transform -translate-y-1/2 px-2.5 py-1 bg-patina-500 hover:bg-patina-600 disabled:bg-patina-300 dark:bg-teal-600 dark:hover:bg-teal-500 dark:disabled:bg-teal-800 text-white text-xs rounded-lg transition-colors"
                  >
                    {fetchingWeather ? (
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                    ) : (
                      <i className="fa-solid fa-search text-xs"></i>
                    )}
                  </button>
                </div>
              </form>

              <div>
                {(() => {
                  // Prioritize custom weather, then task weather
                  const weather = customWeather || tasks.find(t => t.weather_data && t.location)?.weather_data;

                  if (weather) {
                    return (
                      <>
                        <div className="flex items-center justify-center mb-4">
                          <Image
                            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                            alt={weather.description}
                            width={80}
                            height={80}
                            className="w-20 h-20"
                          />
                        </div>
                        <div className="text-center mb-4">
                          <div className="text-4xl font-light text-patina-700 dark:text-teal-200 mb-1">
                            {Math.round(weather.temperature)}°C
                          </div>
                          <p className="text-sm text-patina-600 dark:text-teal-400 mb-1 capitalize">
                            {weather.description}
                          </p>
                          <p className="text-xs text-patina-500 dark:text-teal-500 flex items-center justify-center">
                            <i className="fa-solid fa-location-dot mr-1"></i>
                            {weather.location}
                          </p>
                        </div>
                        <div className="border-t border-patina-200/30 dark:border-teal-700/30 pt-4 mt-4">
                          <div className="grid grid-cols-2 gap-4 text-xs text-patina-600 dark:text-teal-400">
                            <div className="flex items-center justify-center space-x-2">
                              <i className="fa-solid fa-temperature-half"></i>
                              <span>Feels {Math.round(weather.feels_like)}°C</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <i className="fa-solid fa-droplet"></i>
                              <span>{weather.humidity}%</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2 col-span-2">
                              <i className="fa-solid fa-wind"></i>
                              <span>{weather.wind_speed} m/s</span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <div className="text-center py-4">
                        <div className="text-patina-500 dark:text-teal-500 opacity-60 mb-2">
                          <i className="fa-solid fa-cloud-sun text-4xl mb-4"></i>
                        </div>
                        <p className="text-sm text-patina-600 dark:text-teal-400 opacity-70">
                          Search for a location above
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Weekly Overview */}
            <div className="glass-card rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-200 mb-4">This Week</h3>
              {stats && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-patina-600 dark:text-teal-400">Tasks Completed</span>
                    <span className="text-sm font-medium text-patina-700 dark:text-teal-200">
                      {stats.completed_tasks}/{stats.total_tasks}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-patina-200 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.completion_rate || 0}%`,
                        background: 'linear-gradient(to right, #2dd4bf, #10b981)'
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-patina-600 dark:text-teal-400">High Priority Completed</span>
                    <span className="text-sm font-medium text-patina-700 dark:text-teal-200">
                      {stats.completed_by_priority?.high || 0}/{stats.tasks_by_priority?.high || 0}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-patina-200 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.tasks_by_priority?.high > 0 ? ((stats.completed_by_priority?.high || 0) / stats.tasks_by_priority.high) * 100 : 0}%`,
                        background: 'linear-gradient(to right, #fb7185, #f472b6)'
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-200 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-6">
                    <i className="fa-regular fa-clock text-2xl text-patina-300 dark:text-teal-600 mb-2"></i>
                    <p className="text-patina-600 dark:text-teal-400 opacity-70 text-sm">No recent activity</p>
                  </div>
                ) : (
                  tasks.slice(0, 3).map((task, index) => (
                    <div
                      key={task.id}
                      className="group flex items-start space-x-3 p-2 -mx-2 rounded-lg hover:bg-patina-50/50 dark:hover:bg-teal-800/30 transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 transition-transform group-hover:scale-150 ${
                        task.completed ? 'bg-green-400 shadow-sm shadow-green-400/50' :
                        task.priority === 'high' ? 'bg-red-400 shadow-sm shadow-red-400/50' : 'bg-blue-400 shadow-sm shadow-blue-400/50'
                      }`}></div>
                      <div>
                        <p className="text-sm text-patina-700 dark:text-teal-200">
                          {task.completed ? <span className="px-2 py-0.5 rounded-md bg-green-100 dark:!bg-green-700/60 text-green-700 dark:!text-green-100 text-xs font-semibold mr-1.5">✓ Completed</span> : 'Added'} &quot;{task.title}&quot;
                        </p>
                        <p className="text-xs text-patina-600 dark:text-teal-400">
                          {new Date(task.created_at || task.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => router.push('/tasks/new')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 hover:shadow-2xl shadow-lg shadow-patina-500/40 dark:shadow-teal-600/40 z-50"
        title="Add Task"
      >
        <i className="fa-solid fa-plus text-2xl"></i>
      </button>
    </AppShell>
  );
}
