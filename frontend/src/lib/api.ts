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
    if (error.response?.status === 401) {
      // Clear token and redirect to login
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
};

// Tasks API
export const tasksAPI = {
  getAll: (params?: { completed?: boolean; skip?: number; limit?: number }) =>
    api.get('/tasks/', { params }),
  
  getById: (id: number) =>
    api.get(`/tasks/${id}`),
  
  create: (data: any) =>
    api.post('/tasks/', data),
  
  update: (id: number, data: any) =>
    api.put(`/tasks/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/tasks/${id}`),
  
  getStats: () =>
    api.get('/tasks/stats/summary'),
};

// Categories API
export const categoriesAPI = {
  getAll: () =>
    api.get('/tasks/categories'),

  create: (data: { name: string; color: string }) =>
    api.post('/tasks/categories', data),
};

// Calendar API
export const calendarAPI = {
  getEvents: (params?: { timeMin?: string; timeMax?: string }) =>
    api.get('/calendar/events', { params }),

  // Google OAuth login URL
  getGoogleLoginUrl: () => `${API_URL}/auth/google/login`,
};
