export type NotificationType = 'warning' | 'success' | 'info';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  text: string;
  time: string;
}

export const notificationsMock: NotificationItem[] = [
  { id: 1, type: 'warning', text: 'Server maintenance scheduled for tonight', time: 'Just now' },
  { id: 2, type: 'success', text: 'Task "Finish dashboard design" marked as completed', time: '5 minutes ago' },
  { id: 3, type: 'info', text: 'New comment on Task #124: "Add filtering options"', time: '12 minutes ago' },
  { id: 4, type: 'info', text: 'Reminder: Sprint planning tomorrow at 11:00 AM', time: '35 minutes ago' },
  { id: 5, type: 'warning', text: 'High memory usage detected on production', time: '1 hour ago' },
];
