'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id;
  const priorityOptions = [
    {
      key: 'low',
      label: 'Low',
      dotClass: 'bg-emerald-500',
      active: 'bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-900/40 dark:to-emerald-800/30 border-2 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800/30',
      inactive: 'bg-white/60 dark:bg-teal-950/20 border border-patina-200 dark:border-teal-700/40 text-patina-700 dark:text-teal-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600',
    },
    {
      key: 'medium',
      label: 'Medium',
      dotClass: 'bg-amber-500',
      active: 'bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/40 dark:to-amber-800/30 border-2 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-100 shadow-md ring-2 ring-amber-200 dark:ring-amber-800/30',
      inactive: 'bg-white/60 dark:bg-teal-950/20 border border-patina-200 dark:border-teal-700/40 text-patina-700 dark:text-teal-200 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-600',
    },
    {
      key: 'high',
      label: 'High',
      dotClass: 'bg-rose-500',
      active: 'bg-gradient-to-br from-rose-50 to-rose-100/80 dark:from-rose-900/40 dark:to-rose-800/30 border-2 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100 shadow-md ring-2 ring-rose-200 dark:ring-rose-800/30',
      inactive: 'bg-white/60 dark:bg-teal-950/20 border border-patina-200 dark:border-teal-700/40 text-patina-700 dark:text-teal-200 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 hover:border-rose-300 dark:hover:border-rose-600',
    },
  ];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    priority: 'medium',
    location: '',
  });

  const fetchTask = useCallback(async () => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      const task = response.data;
      setFormData({
        title: task.title,
        description: task.description || '',
        date: task.date,
        time: task.time || '',
        priority: task.priority,
        location: task.location || '',
      });
    } catch (error) {
      console.error('Failed to fetch task:', error);
      alert('Failed to load task');
      router.push('/tasks');
    } finally {
      setLoading(false);
    }
  }, [router, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/tasks/${taskId}`, formData);
      router.push('/tasks');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-patina-50 via-white to-patina-100 dark:from-teal-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-patina-600 dark:border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => router.back()}>
      {/* Modal Card */}
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="modal-title text-xl">Edit Task</h2>
          <button
            onClick={() => router.back()}
            className="modal-close-btn"
            type="button"
          >
            <i className="fa-solid fa-times text-lg"></i>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
              placeholder="Enter task title"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-1.5">
                Date
              </label>
              <div className="relative">
                <i className="fa-regular fa-calendar absolute left-3 top-1/2 transform -translate-y-1/2 text-patina-400 dark:text-teal-400 text-sm pointer-events-none"></i>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-1.5">
                Time
              </label>
              <div className="relative">
                <i className="fa-regular fa-clock absolute left-3 top-1/2 transform -translate-y-1/2 text-patina-400 dark:text-teal-400 text-sm pointer-events-none"></i>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => {
                const isActive = formData.priority === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: option.key as 'low' | 'medium' | 'high' })}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${isActive ? option.active : option.inactive}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${option.dotClass}`}></div>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-1.5">
              Location (Optional)
            </label>
            <div className="relative">
              <i className="fa-solid fa-location-dot absolute left-3 top-1/2 transform -translate-y-1/2 text-patina-400 dark:text-teal-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
                placeholder="e.g., Toronto, New York"
              />
            </div>
            <p className="text-xs text-patina-500 dark:text-teal-400 mt-1">Add location to see weather forecast</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-1.5">
              Notes
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all resize-none"
              rows={2}
              placeholder="Add notes or description"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary px-5 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-5 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-check text-sm"></i>
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
