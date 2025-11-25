'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

interface Task {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  location?: string;
  category?: string;
  created_at?: string;
  weather_data?: {
    temperature: number;
    feels_like: number;
    description: string;
    icon: string;
    humidity: number;
    wind_speed: number;
    location: string;
  };
}

export default function TasksPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const loadUser = useAuthStore((state) => state.loadUser);
  const { isDarkMode, toggleDarkMode, initializeTheme } = useThemeStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const fetchTasks = useCallback(async () => {
    try {
      const params: any = {};

      // Add search parameter
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add filter parameters
      if (filter === 'completed') {
        params.completed = true;
      } else if (filter === 'today') {
        params.filter_type = 'today';
      } else if (filter === 'upcoming') {
        params.filter_type = 'upcoming';
      }

      const response = await api.get('/tasks/', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    loadUser();
    fetchTasks();
  }, [fetchTasks, loadUser]);

  const toggleComplete = async (taskId: number, completed: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await api.put(`/tasks/${taskId}`, { completed: !completed });
      if (!completed) {
        showToast(`Task "${task?.title}" completed!`, 'success');
      }
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      showToast('Failed to update task', 'error');
    }
  };

  const openDeleteModal = (taskId: number) => {
    setTaskToDelete(taskId);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  const deleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const task = tasks.find(t => t.id === taskToDelete);
      await api.delete(`/tasks/${taskToDelete}`);
      showToast(`Task "${task?.title}" deleted`, 'success');
      closeDeleteModal();
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      showToast('Failed to delete task', 'error');
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

  const filteredTasks = tasks;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 dark:border-teal-400"></div>
      </div>
    );
  }

  return (
    <>
      <AppShell
        title="Tasks"
        description="Manage your daily tasks and priorities"
        user={user}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      >
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'today'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'upcoming'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40'
              }`}
            >
              Completed
            </button>
          </div>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 pl-10 pr-4 py-2 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white/70 dark:bg-teal-950/30 text-patina-700 dark:text-teal-200 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/30 dark:focus:ring-teal-500/30 focus:border-patina-400 dark:focus:border-teal-500 transition-all"
            />
            <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-patina-400 dark:text-teal-400"></i>
          </div>
        </div>

        {/* Tasks List */}
        <div className="glass-card rounded-2xl p-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-patina-600 dark:text-teal-400 text-lg mb-4">No tasks found</p>
              <button
                onClick={() => router.push('/tasks/new')}
                className="btn-primary px-6 py-3 rounded-xl"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Create Task
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-5 rounded-xl border border-patina-200/30 dark:border-teal-700/30 hover:border-patina-300/50 dark:hover:border-teal-600/50 transition-all"
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleComplete(task.id, task.completed)}
                      className="mt-1 w-5 h-5 text-patina-500 dark:text-teal-400 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <h3
                          className={`font-medium text-patina-700 dark:text-teal-200 ${
                            task.completed ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {task.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-400'
                                : task.priority === 'medium'
                                ? 'bg-amber-400'
                                : 'bg-green-400'
                            }`}
                          ></span>
                          {!task.completed &&
                            (() => {
                              const [year, month, day] = task.date.split('-');
                              const taskDate = new Date(
                                parseInt(year),
                                parseInt(month) - 1,
                                parseInt(day)
                              );
                              const today = new Date();
                              const tomorrow = new Date(today);
                              tomorrow.setDate(tomorrow.getDate() + 1);

                              today.setHours(0, 0, 0, 0);
                              tomorrow.setHours(0, 0, 0, 0);
                              taskDate.setHours(0, 0, 0, 0);

                              const isToday = taskDate.getTime() === today.getTime();
                              const isTomorrow = taskDate.getTime() === tomorrow.getTime();

                              let badgeText = '';
                              let badgeClass = '';

                              if (isToday) {
                                badgeText = 'Due Today';
                                badgeClass =
                                  'text-xs px-2 py-1 rounded-lg bg-red-100/60 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium';
                              } else if (isTomorrow) {
                                badgeText = 'Tomorrow';
                                badgeClass =
                                  'text-xs px-2 py-1 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium';
                              } else {
                                badgeText = taskDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                });
                                badgeClass =
                                  'text-xs px-2 py-1 rounded-lg bg-patina-100/60 dark:bg-teal-800/30 text-patina-700 dark:text-teal-200 font-medium';
                              }

                              return <span className={badgeClass}>{badgeText}</span>;
                            })()}
                          {task.completed && (
                            <span className="text-xs px-2 py-1 rounded-lg bg-green-100/80 dark:bg-green-800/50 text-green-700 dark:text-green-200 font-semibold border border-green-200/50 dark:border-green-600/40">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>
                      {task.description && (
                        <p
                          className={`text-sm text-patina-600 dark:text-teal-400 mb-3 ${
                            task.completed ? 'line-through opacity-70' : ''
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                      {task.weather_data && (
                        <div className="flex items-center space-x-3 mb-3 p-3 bg-patina-50/50 dark:bg-teal-900/20 rounded-xl border border-patina-100/30 dark:border-teal-800/30">
                          <img
                            src={`https://openweathermap.org/img/wn/${task.weather_data.icon}@2x.png`}
                            alt={task.weather_data.description}
                            className="w-12 h-12"
                          />
                          <div className="flex-1">
                            <div className="flex items-baseline space-x-2">
                              <span className="text-2xl font-semibold text-patina-700 dark:text-teal-200">
                                {Math.round(task.weather_data.temperature)}°C
                              </span>
                              <span className="text-sm text-patina-600 dark:text-teal-400 capitalize">
                                {task.weather_data.description}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-patina-600 dark:text-teal-400 mt-1">
                              <span className="flex items-center">
                                <i className="fa-solid fa-droplet mr-1"></i>
                                {task.weather_data.humidity}%
                              </span>
                              <span className="flex items-center">
                                <i className="fa-solid fa-wind mr-1"></i>
                                {task.weather_data.wind_speed} m/s
                              </span>
                              <span className="flex items-center">
                                <i className="fa-solid fa-location-dot mr-1"></i>
                                {task.weather_data.location}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-patina-100/30 dark:border-teal-800/30">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => router.push(`/tasks/${task.id}/edit`)}
                            className="text-patina-500 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-200 transition-colors"
                            title="Edit task"
                          >
                            <i className="fa-solid fa-pen text-sm"></i>
                          </button>
                          <button
                            onClick={() => openDeleteModal(task.id)}
                            className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                            title="Delete task"
                          >
                            <i className="fa-regular fa-trash-can text-sm"></i>
                          </button>
                          {task.category && (
                            <span className="px-2 py-1 text-xs rounded-lg bg-patina-100/60 dark:bg-teal-800/30 text-patina-700 dark:text-teal-200">
                              {task.category}
                            </span>
                          )}
                          {task.location && (
                            <span className="px-2 py-1 text-xs rounded-lg bg-patina-100/60 dark:bg-teal-800/30 text-patina-700 dark:text-teal-200">
                              <i className="fa-solid fa-location-dot mr-1"></i>
                              {task.location}
                            </span>
                          )}
                        </div>
                        {task.created_at && (
                          <span className="text-xs text-patina-400 dark:text-teal-500">
                            <i className="fa-solid fa-clock mr-1.5"></i>
                            Created{' '}
                            {new Date(task.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          {/* Modal */}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
                <i className="fa-regular fa-trash-can text-red-500 dark:text-red-400 text-3xl"></i>
              </div>
              <h3 className="modal-title mb-3">Delete Task</h3>
              <p className="text-patina-600 dark:text-teal-300 mb-8 text-base">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 btn-secondary px-6 py-3 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteTask}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                >
                  <i className="fa-solid fa-trash mr-2"></i>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => router.push('/tasks/new')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl shadow-lg shadow-patina-500/40 dark:shadow-teal-600/40 z-50"
        title="Add Task"
      >
        <i className="fa-solid fa-plus text-2xl"></i>
      </button>
    </>
  );
}
