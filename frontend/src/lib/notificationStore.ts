/**
 * Notification store using Zustand for persistent notifications
 */
import { create } from 'zustand';

export type NotificationType = 'warning' | 'success' | 'info' | 'error';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  text: string;
  time: string;
  timestamp: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (type: NotificationType, text: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  initializeNotifications: () => void;
}

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const STORAGE_KEY = 'taskleaf_notifications';
const MAX_NOTIFICATIONS = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (type: NotificationType, text: string) => set((state) => {
    const newNotification: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      text,
      time: 'Just now',
      timestamp: Date.now(),
    };

    const updatedNotifications = [newNotification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications));
    }

    return { notifications: updatedNotifications };
  }),

  removeNotification: (id: string) => set((state) => {
    const updatedNotifications = state.notifications.filter(n => n.id !== id);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications));
    }

    return { notifications: updatedNotifications };
  }),

  clearAll: () => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    return { notifications: [] };
  }),

  initializeNotifications: () => set(() => {
    if (typeof window === 'undefined') return { notifications: [] };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { notifications: [] };

    try {
      const parsed: NotificationItem[] = JSON.parse(saved);
      // Update relative times
      const updated = parsed.map(n => ({
        ...n,
        time: formatTimeAgo(n.timestamp),
      }));
      return { notifications: updated };
    } catch {
      return { notifications: [] };
    }
  }),
}));
