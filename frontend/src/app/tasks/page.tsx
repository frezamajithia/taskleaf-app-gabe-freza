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

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedTasks(new Set());
    }
  }, [selectionMode]);

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

  // Bulk selection handlers
  const toggleTaskSelection = (taskId: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const bulkComplete = async () => {
    if (selectedTasks.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedTasks).map(taskId =>
        api.put(`/tasks/${taskId}`, { completed: true })
      );
      await Promise.all(promises);
      showToast(`${selectedTasks.size} tasks completed!`, 'success');
      setSelectedTasks(new Set());
      setSelectionMode(false);
      fetchTasks();
    } catch (error) {
      console.error('Failed to complete tasks:', error);
      showToast('Failed to complete some tasks', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedTasks).map(taskId =>
        api.delete(`/tasks/${taskId}`)
      );
      await Promise.all(promises);
      showToast(`${selectedTasks.size} tasks deleted`, 'success');
      setSelectedTasks(new Set());
      setSelectionMode(false);
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete tasks:', error);
      showToast('Failed to delete some tasks', 'error');
    } finally {
      setBulkActionLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-patina-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-patina-200 dark:border-teal-800 border-t-patina-500 dark:border-t-teal-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fa-solid fa-tasks text-patina-500 dark:text-teal-400 text-lg animate-pulse"></i>
            </div>
          </div>
          <p className="text-patina-600 dark:text-teal-400 font-medium animate-pulse">Loading your tasks...</p>
        </div>
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
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white shadow-lg shadow-patina-500/30 dark:shadow-teal-600/30'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40 hover:scale-105'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === 'today'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white shadow-lg shadow-patina-500/30 dark:shadow-teal-600/30'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40 hover:scale-105'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === 'upcoming'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white shadow-lg shadow-patina-500/30 dark:shadow-teal-600/30'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40 hover:scale-105'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === 'completed'
                  ? 'bg-patina-500 dark:bg-teal-600 text-white shadow-lg shadow-patina-500/30 dark:shadow-teal-600/30'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40 hover:scale-105'
              }`}
            >
              Completed
            </button>

            {/* Selection Mode Toggle */}
            <div className="h-6 w-px bg-patina-200 dark:bg-teal-700 mx-2"></div>
            <button
              onClick={() => setSelectionMode(!selectionMode)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectionMode
                  ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-700 dark:text-teal-200 hover:bg-patina-200/50 dark:hover:bg-teal-800/40 hover:scale-105'
              }`}
            >
              <i className={`fa-solid ${selectionMode ? 'fa-xmark' : 'fa-check-double'} mr-2`}></i>
              {selectionMode ? 'Cancel' : 'Select'}
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

        {/* Bulk Action Bar */}
        {selectionMode && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-200/50 dark:border-indigo-700/30 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllTasks}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 text-sm font-medium hover:bg-white dark:hover:bg-indigo-800/50 transition-all"
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.size === tasks.length && tasks.length > 0}
                  onChange={selectAllTasks}
                  className="w-4 h-4 rounded"
                />
                Select All
              </button>
              <span className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">
                {selectedTasks.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={bulkComplete}
                disabled={selectedTasks.size === 0 || bulkActionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-800 text-white text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 disabled:hover:scale-100"
              >
                {bulkActionLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-check"></i>
                )}
                Complete
              </button>
              <button
                onClick={bulkDelete}
                disabled={selectedTasks.size === 0 || bulkActionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-800 text-white text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 disabled:hover:scale-100"
              >
                {bulkActionLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-trash"></i>
                )}
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="glass-card rounded-2xl p-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-patina-100 to-teal-100 dark:from-teal-900/50 dark:to-teal-800/30 flex items-center justify-center">
                <i className="fa-solid fa-clipboard-list text-4xl text-patina-400 dark:text-teal-500"></i>
              </div>
              <h3 className="text-xl font-semibold text-patina-700 dark:text-teal-200 mb-2">No tasks found</h3>
              <p className="text-patina-500 dark:text-teal-400 mb-6">Create your first task to get started!</p>
              <button
                onClick={() => router.push('/tasks/new')}
                className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <i className="fa-solid fa-plus"></i>
                Create Task
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`group p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                    selectedTasks.has(task.id)
                      ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md shadow-indigo-500/10'
                      : 'border-patina-200/30 dark:border-teal-700/30 hover:border-patina-300/50 dark:hover:border-teal-600/50'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start space-x-4">
                    {selectionMode ? (
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="mt-1 w-5 h-5 rounded cursor-pointer accent-indigo-500"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleComplete(task.id, task.completed)}
                        className="custom-checkbox mt-1 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <h3
                          className={`font-medium text-patina-700 dark:text-teal-200 transition-all ${
                            task.completed ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {task.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
                              task.priority === 'high'
                                ? 'bg-red-400 shadow-sm shadow-red-400/50'
                                : task.priority === 'medium'
                                ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                                : 'bg-green-400 shadow-sm shadow-green-400/50'
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
                                  'text-xs px-2 py-1 rounded-lg bg-red-100/60 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium animate-pulse';
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
                            className="p-2 text-patina-500 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-200 hover:bg-patina-100/50 dark:hover:bg-teal-800/50 rounded-lg transition-all duration-200"
                            title="Edit task"
                          >
                            <i className="fa-solid fa-pen text-sm"></i>
                          </button>
                          <button
                            onClick={() => openDeleteModal(task.id)}
                            className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
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
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105"
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
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 hover:shadow-2xl shadow-lg shadow-patina-500/40 dark:shadow-teal-600/40 z-50"
        title="Add Task"
      >
        <i className="fa-solid fa-plus text-2xl"></i>
      </button>
    </>
  );
}
