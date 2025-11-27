/**
 * API client for TaskLeaf backend
 */
import axios from 'axios';

// Use the API URL directly from environment variable
// The URL should already include /api path (e.g., http://localhost:8000/api)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect for auth endpoints - let the login/register pages handle their own errors
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
                           error.config?.url?.includes('/auth/register') ||
                           error.config?.url?.includes('/auth/forgot-password') ||
                           error.config?.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clear token and redirect to login (only for protected routes)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  getCurrentUser: () =>
    api.get('/auth/me'),

  // Password reset
  requestPasswordReset: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, new_password: newPassword }),
};

// Task data interface
export interface TaskData {
  title: string;
  description?: string;
  date?: string;
  time?: string;
  priority?: string;
  location?: string;
  category_id?: number;
  sync_with_google_calendar?: boolean;
}

// Tasks API
export const tasksAPI = {
  getAll: (params?: { completed?: boolean; skip?: number; limit?: number }) =>
    api.get('/tasks/', { params }),

  getById: (id: number) =>
    api.get(`/tasks/${id}`),

  create: (data: TaskData) =>
    api.post('/tasks/', data),

  update: (id: number, data: Partial<TaskData> & { completed?: boolean }) =>
    api.put(`/tasks/${id}`, data),

  delete: (id: number) =>
    api.delete(`/tasks/${id}`),

  getStats: () =>
    api.get('/tasks/stats/summary'),

  // Google Calendar sync
  syncToCalendar: (id: number) =>
    api.post(`/tasks/${id}/sync-to-calendar`),

  unsyncFromCalendar: (id: number) =>
    api.delete(`/tasks/${id}/unsync-from-calendar`),
};

// Categories API
export const categoriesAPI = {
  getAll: () =>
    api.get('/tasks/categories'),

  create: (data: { name: string; color: string }) =>
    api.post('/tasks/categories', data),
};

// Calendar event data interface
export interface CalendarEventData {
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  recurrence?: string;  // none, daily, weekly, monthly, yearly
}

// Calendar API
export const calendarAPI = {
  // Get events from Google Calendar
  getEvents: (params?: { timeMin?: string; timeMax?: string }) =>
    api.get('/calendar/events', { params }),

  // Create event in Google Calendar
  createEvent: (data: CalendarEventData) =>
    api.post('/calendar/events', data),

  // Update event in Google Calendar
  updateEvent: (eventId: string, data: CalendarEventData) =>
    api.put(`/calendar/events/${eventId}`, data),

  // Delete event from Google Calendar
  deleteEvent: (eventId: string) =>
    api.delete(`/calendar/events/${eventId}`),

  // Check if Google Calendar is connected
  getStatus: () =>
    api.get('/calendar/status'),

  // Google OAuth login URL
  getGoogleLoginUrl: () => `${API_URL}/auth/google/login`,
};
export const analyticsAPI = {
  getMetrics: () => api.get('/analytics/metrics'),
  getDailyStats: (days: number = 30) => 
    api.get('/analytics/daily-stats', { params: { days } }),
};
// Pomodoro API methods
export const pomodoroAPI = {
  // Create a new session
  createSession: (data: { session_type: string; target_duration: number }) => 
    api.post('/pomodoro/sessions', data),
  
  // Update session progress (called every minute)
  updateSession: (sessionId: number, data: { elapsed_minutes: number; is_completed?: boolean }) => 
    api.put(`/pomodoro/sessions/${sessionId}`, data),
  
  // Get active session
  getActiveSession: () => 
    api.get('/pomodoro/sessions/active'),
  
  // Get recent sessions
  getSessions: (days: number = 7) => 
    api.get('/pomodoro/sessions', { params: { days } }),
  
  // Get statistics
  getStats: () => 
    api.get('/pomodoro/stats'),
  
  // Delete a session
  deleteSession: (id: number) => 
    api.delete(`/pomodoro/sessions/${id}`),
};