'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { tasksAPI, calendarAPI } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Plus, ChevronLeft, ChevronRight, Menu, X, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { EventTooltip } from '@/components/ui/EventTooltip';

interface Task {
  id: number;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  category?: {
    id: number;
    name: string;
    color: string;
  };
  weather_data?: any;
  location?: string;
  google_calendar_event_id?: string;
  sync_with_google_calendar?: boolean;
}

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  tag?: string;
  color: string;
  googleEventId?: string; // Google Calendar event ID if synced
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedView, setSelectedView] = useState<'day' | 'week' | 'month'>('month');

  // Event management state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    time: '',
    tag: '',
    color: '#14b8a6',
    syncToGoogle: false,
    recurrence: 'none' as RecurrenceType,
    recurrenceEndDate: ''
  });
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadUser();
    const storedEvents = localStorage.getItem('calendar_events');
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
  }, [loadUser]);

  useEffect(() => {
    // Don't redirect while still loading user data
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchTasks();
    if (user?.google_id) {
      fetchGoogleCalendarEvents();
    }
  }, [isAuthenticated, isLoading, router, user?.google_id]);

  useEffect(() => {
    localStorage.setItem('calendar_events', JSON.stringify(events));
  }, [events]);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchGoogleCalendarEvents = async () => {
    try {
      setIsSyncingGoogle(true);
      // Fetch a wider range (6 months back, 12 months forward) to capture recurring events
      const today = new Date();
      const timeMin = new Date(today.getFullYear(), today.getMonth() - 6, 1);
      const timeMax = new Date(today.getFullYear(), today.getMonth() + 12, 0);

      const response = await calendarAPI.getEvents({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      });

      const formattedEvents: CalendarEvent[] = response.data.items.map((event: any) => {
        const start = event.start?.dateTime || event.start?.date;
        const startDate = new Date(start);
        return {
          id: `google-${event.id}`,
          title: event.summary || 'Untitled Event',
          date: startDate.toISOString().split('T')[0],
          time: event.start?.dateTime ? startDate.toTimeString().slice(0, 5) : undefined,
          tag: 'Google Calendar',
          color: '#4285f4', // Google blue
        };
      });

      setGoogleEvents(formattedEvents);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('Google Calendar not connected');
      } else {
        console.error('Failed to fetch Google Calendar events:', error);
      }
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  const handleGoogleCalendarSync = async () => {
    if (user?.google_id) {
      await fetchGoogleCalendarEvents();
      showToast('Google Calendar synced!', 'success');
    } else {
      window.location.href = calendarAPI.getGoogleLoginUrl();
    }
  };

  // Event management functions
  const openEventModal = (date?: string, event?: CalendarEvent, hourIndex?: number) => {
    if (date) {
      setSelectedDate(date);
    }
    if (event) {
      setSelectedEvent(event);
      setEventForm({
        title: event.title,
        time: event.time || '',
        tag: event.tag || '',
        color: event.color,
        syncToGoogle: !!event.googleEventId,
        recurrence: event.recurrence || 'none',
        recurrenceEndDate: event.recurrenceEndDate || ''
      });
    } else {
      setSelectedEvent(null);
      const defaultTime = hourIndex !== undefined
        ? `${String(hourIndex).padStart(2, '0')}:00`
        : '';
      setEventForm({
        title: '',
        time: defaultTime,
        tag: '',
        color: '#14b8a6',
        syncToGoogle: !!user?.google_id, // Default to true if Google is connected
        recurrence: 'none',
        recurrenceEndDate: ''
      });
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setSelectedDate('');
    setEventForm({
      title: '',
      time: '',
      tag: '',
      color: '#14b8a6',
      syncToGoogle: false,
      recurrence: 'none',
      recurrenceEndDate: ''
    });
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      showToast('Please enter an event title', 'warning');
      return;
    }

    setIsSavingEvent(true);
    const eventDate = selectedDate || new Date().toISOString().split('T')[0];

    try {
      if (selectedEvent) {
        // Editing existing event
        let googleEventId = selectedEvent.googleEventId;

        // Check if this is a Google-originated event (id starts with 'google-')
        const isGoogleEvent = selectedEvent.id.startsWith('google-');

        if (eventForm.syncToGoogle && user?.google_id) {
          if (googleEventId) {
            // Update existing Google Calendar event
            await calendarAPI.updateEvent(googleEventId, {
              title: eventForm.title,
              description: eventForm.tag || '',
              date: eventDate,
              time: eventForm.time || undefined,
              recurrence: eventForm.recurrence || 'none',
            });
          } else if (!isGoogleEvent) {
            // Create new Google Calendar event for local event
            const response = await calendarAPI.createEvent({
              title: eventForm.title,
              description: eventForm.tag || '',
              date: eventDate,
              time: eventForm.time || undefined,
              recurrence: eventForm.recurrence || 'none',
            });
            googleEventId = response.data.event?.id;
          }
        } else if (!eventForm.syncToGoogle && googleEventId && !isGoogleEvent) {
          // User disabled sync - delete from Google Calendar
          try {
            await calendarAPI.deleteEvent(googleEventId);
          } catch (err) {
            console.error('Failed to delete from Google Calendar:', err);
          }
          googleEventId = undefined;
        }

        // Don't allow editing Google-originated events locally (they should be edited in Google Calendar)
        if (isGoogleEvent) {
          showToast('Google Calendar events should be edited in Google Calendar directly', 'info');
          closeEventModal();
          return;
        }

        setEvents(events.map(e =>
          e.id === selectedEvent.id
            ? {
                ...e,
                title: eventForm.title,
                time: eventForm.time,
                tag: eventForm.tag,
                color: eventForm.color,
                googleEventId,
                recurrence: eventForm.recurrence,
                recurrenceEndDate: eventForm.recurrenceEndDate
              }
            : e
        ));
      } else {
        // Creating new event
        let googleEventId: string | undefined;

        if (eventForm.syncToGoogle && user?.google_id) {
          // Create event in Google Calendar
          const response = await calendarAPI.createEvent({
            title: eventForm.title,
            description: eventForm.tag || '',
            date: eventDate,
            time: eventForm.time || undefined,
            recurrence: eventForm.recurrence || 'none',
          });
          googleEventId = response.data.event?.id;
        }

        const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: eventForm.title,
          date: eventDate,
          time: eventForm.time,
          tag: eventForm.tag,
          color: eventForm.color,
          googleEventId,
          recurrence: eventForm.recurrence,
          recurrenceEndDate: eventForm.recurrenceEndDate
        };
        setEvents([...events, newEvent]);
      }

      // Refresh Google events to show the synced event
      if (eventForm.syncToGoogle && user?.google_id) {
        fetchGoogleCalendarEvents();
      }

      showToast(selectedEvent ? 'Event updated successfully!' : 'Event created successfully!', 'success');
      closeEventModal();
    } catch (error: any) {
      console.error('Failed to save event:', error);
      showToast(error.response?.data?.detail || 'Failed to sync with Google Calendar. Event saved locally.', 'error');

      // Still save locally even if Google sync fails
      if (!selectedEvent) {
        const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: eventForm.title,
          date: eventDate,
          time: eventForm.time,
          tag: eventForm.tag,
          color: eventForm.color
        };
        setEvents([...events, newEvent]);
      }
      closeEventModal();
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteEvent = async () => {
    if (selectedEvent) {
      setIsSavingEvent(true);
      try {
        // Check if this is a Google-originated event
        const isGoogleEvent = selectedEvent.id.startsWith('google-');

        // Delete from Google Calendar if synced
        if (selectedEvent.googleEventId && user?.google_id) {
          await calendarAPI.deleteEvent(selectedEvent.googleEventId);
        } else if (isGoogleEvent && user?.google_id) {
          // Extract the actual Google event ID from the prefixed ID
          const googleId = selectedEvent.id.replace('google-', '');
          await calendarAPI.deleteEvent(googleId);
        }

        // Remove from local state (only if it's a local event)
        if (!isGoogleEvent) {
          setEvents(events.filter(e => e.id !== selectedEvent.id));
        }

        // Refresh Google events
        if (user?.google_id) {
          fetchGoogleCalendarEvents();
        }

        showToast('Event deleted successfully', 'success');
      } catch (error: any) {
        console.error('Failed to delete event:', error);
        showToast(error.response?.data?.detail || 'Failed to delete from Google Calendar', 'error');
      } finally {
        setIsSavingEvent(false);
        setShowDeleteModal(false);
        closeEventModal();
      }
    }
  };

  const cancelDeleteEvent = () => {
    setShowDeleteModal(false);
  };

  // Helper function to check if a recurring event occurs on a given date
  const isRecurringOnDate = (event: CalendarEvent, targetDate: Date): boolean => {
    if (!event.recurrence || event.recurrence === 'none') return false;

    const eventDate = new Date(event.date + 'T00:00:00');
    const endDate = event.recurrenceEndDate ? new Date(event.recurrenceEndDate + 'T00:00:00') : null;

    // Check if target is before event start or after end date
    if (targetDate < eventDate) return false;
    if (endDate && targetDate > endDate) return false;

    const diffTime = targetDate.getTime() - eventDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    switch (event.recurrence) {
      case 'daily':
        return true;
      case 'weekly':
        return diffDays % 7 === 0;
      case 'monthly':
        return targetDate.getDate() === eventDate.getDate();
      case 'yearly':
        return (
          targetDate.getDate() === eventDate.getDate() &&
          targetDate.getMonth() === eventDate.getMonth()
        );
      default:
        return false;
    }
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetDate = new Date(dateStr + 'T00:00:00');

    // Get direct matches (non-recurring or base date of recurring)
    const directMatches = events.filter(event => event.date === dateStr && !event.googleEventId);

    // Get recurring event instances for this date
    const recurringInstances = events.filter(event => {
      if (!event.recurrence || event.recurrence === 'none') return false;
      if (event.date === dateStr) return false; // Already in direct matches
      if (event.googleEventId) return false; // Skip synced events
      return isRecurringOnDate(event, targetDate);
    }).map(event => ({
      ...event,
      id: `${event.id}-recurring-${dateStr}`, // Unique ID for this instance
      date: dateStr // Show on this date
    }));

    const localEvents = [...directMatches, ...recurringInstances];
    const gEvents = showGoogleEvents ? googleEvents.filter(event => event.date === dateStr) : [];
    return [...localEvents, ...gEvents];
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getTasksForDate = (day: number) => {
    return tasks.filter((task) => {
      if (!task.date) return false;
      const taskDate = new Date(task.date);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === currentDate.getMonth() &&
        taskDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#3b82f6';
    }
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add the actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    // Only pad to complete the last row (not always 42)
    const remainder = days.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        days.push(null);
      }
    }

    return days;
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  // Calendar Actions - simplified, most controls moved to main calendar area
  const calendarActions = null;

  // Mini calendar helper - get days for mini calendar
  const getMiniCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  return (
    <AppShell
      title="Calendar"
      description="Manage your schedule and events"
      user={user}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
      actions={calendarActions}
    >
      {/* Calendar Container - Full width with collapsible sidebar */}
      <div className="h-[calc(100vh-130px)] flex relative">
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Collapsible Sidebar */}
        <div className={`
          fixed lg:relative z-50 lg:z-auto
          h-full lg:h-auto
          bg-white/95 dark:bg-teal-950/95 lg:bg-transparent dark:lg:bg-transparent
          backdrop-blur-xl lg:backdrop-blur-none
          shadow-2xl lg:shadow-none
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 w-0'}
          overflow-hidden
        `}>
          <div className="w-72 h-full flex flex-col gap-4 p-4 lg:p-0 lg:pr-6">
            {/* Close Button (mobile) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden self-end p-2 rounded-xl hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
            >
              <X className="h-5 w-5 text-patina-600 dark:text-teal-400" />
            </button>

            {/* Create Event Button */}
            <button
              onClick={() => {
                openEventModal();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-lg shadow-patina-500/30 dark:shadow-teal-600/30 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Create Event
            </button>

            {/* Mini Calendar */}
            <div className="sidebar-card p-4">
              {/* Mini Calendar Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-patina-700 dark:text-teal-200">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-1 rounded-lg hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-patina-600 dark:text-teal-400" />
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-1 rounded-lg hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-patina-600 dark:text-teal-400" />
                  </button>
                </div>
              </div>

              {/* Mini Calendar Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-patina-500 dark:text-teal-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Mini Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {getMiniCalendarDays().map((day, index) => {
                  const isTodayDay = day ? isToday(day) : false;
                  const dayEvents = day ? getEventsForDate(day) : [];
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (day) {
                          const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                          setCurrentDate(newDate);
                          setSelectedView('day');
                          setSidebarOpen(false);
                        }
                      }}
                      className={`h-7 w-7 text-xs rounded-full flex items-center justify-center transition-all relative ${
                        day
                          ? isTodayDay
                            ? 'bg-blue-600 dark:bg-blue-500 text-white font-bold'
                            : 'text-patina-700 dark:text-teal-200 hover:bg-patina-100 dark:hover:bg-teal-800/50'
                          : ''
                      }`}
                      disabled={!day}
                    >
                      {day}
                      {hasEvents && !isTodayDay && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-patina-500 dark:bg-teal-400"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google Calendar Status */}
            <div className="sidebar-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-semibold text-patina-700 dark:text-teal-200">Google Calendar</span>
              </div>
              {user?.google_id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <i className="fa-solid fa-check-circle"></i>
                    <span>Connected</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGoogleEvents}
                      onChange={(e) => setShowGoogleEvents(e.target.checked)}
                      className="w-4 h-4 rounded border-patina-300 dark:border-teal-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-patina-600 dark:text-teal-300">Show Google events</span>
                  </label>
                  <button
                    onClick={handleGoogleCalendarSync}
                    disabled={isSyncingGoogle}
                    className="sync-now-btn w-full mt-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSyncingGoogle ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleCalendarSync}
                  className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Connect Google
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 glass-card rounded-2xl p-3 flex flex-col overflow-hidden">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            {/* Left side - Menu, Today, Navigation */}
            <div className="flex items-center gap-2">
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-white/60 dark:bg-teal-800/50 border border-patina-200/50 dark:border-teal-600/40 hover:bg-white/80 dark:hover:bg-teal-700/60 transition-all hover:shadow-md"
                title="Toggle sidebar"
              >
                <Menu className="h-4 w-4 text-patina-600 dark:text-teal-400" />
              </button>

              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-medium text-patina-700 dark:text-teal-200 bg-white/60 dark:bg-teal-800/50 border border-patina-200/50 dark:border-teal-600/40 rounded-lg hover:bg-white/80 dark:hover:bg-teal-700/60 transition-colors"
              >
                Today
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={selectedView === 'month' ? goToPreviousMonth : selectedView === 'week' ? goToPreviousWeek : goToPreviousDay}
                  className="p-1.5 rounded-lg hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-patina-600 dark:text-teal-400" />
                </button>
                <button
                  onClick={selectedView === 'month' ? goToNextMonth : selectedView === 'week' ? goToNextWeek : goToNextDay}
                  className="p-1.5 rounded-lg hover:bg-patina-100 dark:hover:bg-teal-800/50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-patina-600 dark:text-teal-400" />
                </button>
              </div>
              <h2 className="text-base font-bold text-patina-800 dark:text-teal-100">
                {selectedView === 'day'
                  ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            {/* Right side - View Switcher & Create */}
            <div className="flex items-center gap-2">
              {/* Quick Create Button (visible when sidebar closed) */}
              <button
                onClick={() => openEventModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] font-medium text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New</span>
              </button>

              {/* View Switcher */}
              <div className="inline-flex rounded-full bg-white/60 dark:bg-teal-900/40 p-1 border border-patina-200/50 dark:border-teal-700/40">
                {['day', 'week', 'month'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view as 'day' | 'week' | 'month')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      selectedView === view
                        ? 'bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white shadow-md'
                        : 'text-patina-700 dark:text-teal-200 hover:bg-white/40 dark:hover:bg-teal-800/40'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Days Header */}
          {selectedView === 'month' && (
            <div className="grid grid-cols-7 gap-1 mb-0.5 flex-shrink-0">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                <div
                  key={day}
                  className="text-center py-1 text-[10px] font-semibold text-patina-600 dark:text-teal-400 uppercase tracking-wide"
                >
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>
          )}

          {/* Month View */}
          {selectedView === 'month' && (() => {
            const calendarDays = generateCalendarDays();
            const numRows = Math.ceil(calendarDays.length / 7);
            return (
            <div className="grid grid-cols-7 gap-1 flex-1 calendar-grid-enter" style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}>
              {calendarDays.map((day, index) => {
                const dayTasks = day ? getTasksForDate(day) : [];
                const dayEvents = day ? getEventsForDate(day) : [];
                const isTodayCell = day ? isToday(day) : false;
                const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const totalItems = dayEvents.length + dayTasks.length;
                const allItems = [...dayEvents.map(e => ({ type: 'event' as const, data: e })), ...dayTasks.map(t => ({ type: 'task' as const, data: t }))];

                return (
                  <div
                    key={index}
                    tabIndex={day ? 0 : -1}
                    className={`calendar-day rounded-md p-1 flex flex-col overflow-hidden min-h-0 ${
                      day
                        ? isTodayCell
                          ? 'today-cell bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-500 shadow-sm'
                          : 'bg-white/70 dark:bg-teal-800/40 border border-patina-200/60 dark:border-teal-700/40'
                        : 'bg-patina-50/20 dark:bg-teal-900/10 cursor-default'
                    }`}
                    onDoubleClick={() => {
                      if (day) {
                        openEventModal(dateStr);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (day && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        openEventModal(dateStr);
                      }
                    }}
                  >
                    {day ? (
                      <div className="calendar-day-content flex flex-col h-full">
                        <div className="flex justify-between items-start mb-1 flex-shrink-0 px-1 pt-1">
                          <span
                            className={`calendar-number font-bold leading-none ${
                              isTodayCell
                                ? 'today-indicator bg-blue-600 dark:bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px]'
                                : 'text-patina-700 dark:text-teal-200 text-[11px]'
                            }`}
                          >
                            {day}
                          </span>
                          {totalItems > 2 && (
                            <span className="text-[7px] font-medium text-patina-400 dark:text-teal-500 bg-patina-100/80 dark:bg-teal-900/50 px-0.5 rounded-full">
                              +{totalItems - 2}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                          {/* Display combined items (events + tasks) - max 2 */}
                          {allItems.slice(0, 2).map((item) => {
                            if (item.type === 'event') {
                              const event = item.data as CalendarEvent;
                              const isGoogleSynced = !!(event.googleEventId || event.id.startsWith('google-'));
                              return (
                                <EventTooltip
                                  key={`event-${event.id}`}
                                  title={event.title}
                                  time={event.time}
                                  date={event.date}
                                  tag={event.tag}
                                  color={event.color}
                                  isGoogleEvent={isGoogleSynced}
                                >
                                  <div
                                    className={`event-card event-pill px-1.5 py-0.5 rounded cursor-pointer ${
                                      isGoogleSynced
                                        ? 'calendar-event-google'
                                        : 'calendar-event-local'
                                    }`}
                                    style={{ borderLeftColor: event.color, borderLeftWidth: '2px' }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      openEventModal(dateStr, event);
                                    }}
                                  >
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[10px] font-semibold truncate flex-1 leading-none">
                                        {event.title}
                                      </span>
                                      {event.recurrence && event.recurrence !== 'none' && (
                                        <i className="fa-solid fa-repeat text-[7px] text-patina-500 dark:text-teal-400 flex-shrink-0"></i>
                                      )}
                                      {isGoogleSynced && (
                                        <i className="fa-brands fa-google text-[7px] text-blue-500 dark:text-blue-300 flex-shrink-0"></i>
                                      )}
                                    </div>
                                  </div>
                                </EventTooltip>
                              );
                            } else {
                              const task = item.data as Task;
                              return (
                                <div
                                  key={`task-${task.id}`}
                                  className={`event-card px-1.5 py-0.5 rounded ${
                                    task.google_calendar_event_id
                                      ? 'calendar-task-synced'
                                      : 'calendar-task-local'
                                  }`}
                                  style={{ borderLeftColor: getPriorityColor(task.priority), borderLeftWidth: '2px' }}
                                  title={`Task: ${task.title}${task.google_calendar_event_id ? ' (Synced)' : ''}`}
                                >
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-[10px] font-medium truncate flex-1 leading-none">
                                      {task.title}
                                    </span>
                                    {task.google_calendar_event_id && (
                                      <i className="fa-brands fa-google text-[7px] text-blue-500 dark:text-blue-300 flex-shrink-0"></i>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}

          {/* Week View */}
          {selectedView === 'week' && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex gap-2">
                {/* Time Column */}
                <div className="w-16 flex-shrink-0">
                  <div className="h-14"></div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="h-14 text-xs text-patina-500 dark:text-teal-400 pr-2 text-right pt-1 font-medium">
                      {i === 0 ? '12A' : i < 12 ? `${i}A` : i === 12 ? '12P' : `${i - 12}P`}
                    </div>
                  ))}
                </div>

                {/* Week Days */}
                <div className="flex-1 grid grid-cols-7 gap-2">
                  {(() => {
                    const weekStart = new Date(currentDate);
                    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

                    return Array.from({ length: 7 }, (_, dayIndex) => {
                      const dayDate = new Date(weekStart);
                      dayDate.setDate(weekStart.getDate() + dayIndex);
                      const dayNum = dayDate.getDate();
                      const isTodayDay = isToday(dayNum) && dayDate.getMonth() === currentDate.getMonth();
                      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const localWeekEvents = events.filter(event => event.date === dateStr && !event.googleEventId);
                      const gWeekEvents = showGoogleEvents ? googleEvents.filter(event => event.date === dateStr) : [];
                      const weekDayEvents = [...localWeekEvents, ...gWeekEvents];
                      const weekDayTasks = tasks.filter((task) => {
                        if (!task.date) return false;
                        const taskDate = new Date(task.date);
                        return taskDate.toDateString() === dayDate.toDateString();
                      });

                      return (
                        <div key={dayIndex} className="flex flex-col">
                          {/* Day Header */}
                          <div className={`h-14 flex flex-col items-center justify-center mb-2 rounded-xl transition-all ${
                            isTodayDay
                              ? 'bg-blue-600 dark:bg-blue-500 shadow-md'
                              : 'bg-white/50 dark:bg-teal-900/40 border border-patina-100 dark:border-teal-700/40'
                          }`}>
                            <div className={`text-xs font-medium ${isTodayDay ? 'text-white' : 'text-patina-500 dark:text-teal-400'}`}>
                              {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold ${isTodayDay ? 'text-white' : 'text-patina-700 dark:text-teal-100'}`}>
                              {dayNum}
                            </div>
                          </div>

                          {/* Hour Grid */}
                          <div className="relative">
                            {Array.from({ length: 24 }, (_, hourIndex) => {
                              const hourEvents = weekDayEvents.filter(event => {
                                if (!event.time) return hourIndex === 9;
                                const eventHour = parseInt(event.time.split(':')[0]);
                                return eventHour === hourIndex;
                              });

                              return (
                                <div
                                  key={hourIndex}
                                  className="h-14 border-t border-patina-100/50 dark:border-teal-700/30 relative hover:bg-patina-50/30 dark:hover:bg-teal-800/40 transition-colors"
                                  onDoubleClick={() => openEventModal(dateStr, undefined, hourIndex)}
                                >
                                  {(hourEvents.length > 0 || (hourIndex === 9 && weekDayTasks.length > 0)) && (
                                    <div className="space-y-1 p-1">
                                      {hourEvents.map((event) => {
                                        const isGoogleSynced = event.googleEventId || event.id.startsWith('google-');
                                        return (
                                          <div
                                            key={event.id}
                                            className={`px-2 py-1 rounded-md cursor-pointer border-l-2 transition-all shadow-sm ${
                                              isGoogleSynced
                                                ? 'bg-blue-100 dark:bg-blue-900/70 hover:bg-blue-200 dark:hover:bg-blue-800/80 text-blue-800 dark:text-white'
                                                : 'bg-white/90 dark:bg-teal-800/70 hover:bg-patina-50 dark:hover:bg-teal-700/80 text-patina-800 dark:text-white'
                                            }`}
                                            onDoubleClick={(e) => {
                                              e.stopPropagation();
                                              openEventModal(dateStr, event);
                                            }}
                                            style={{ borderLeftColor: event.color }}
                                            title={isGoogleSynced ? `${event.title} (Synced to Google Calendar)` : event.title}
                                          >
                                            <div className="flex items-center gap-1">
                                              <div className="text-xs font-semibold truncate leading-tight flex-1">
                                                {event.time && <span className="opacity-70 mr-1">{event.time}</span>}
                                                {event.title}
                                              </div>
                                              {isGoogleSynced && (
                                                <i className="fa-brands fa-google text-[8px] text-blue-500 dark:text-blue-300 flex-shrink-0"></i>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {hourIndex === 9 && weekDayTasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className={`px-2 py-1 rounded-md border-l-2 ${
                                            task.google_calendar_event_id
                                              ? 'bg-blue-100/70 dark:bg-blue-900/60 text-blue-700 dark:text-white'
                                              : 'bg-amber-100/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-100'
                                          }`}
                                          style={{ borderLeftColor: getPriorityColor(task.priority) }}
                                          title={task.google_calendar_event_id ? `${task.title} (Synced)` : task.title}
                                        >
                                          <div className="flex items-center gap-1">
                                            <div className="text-xs font-medium truncate leading-tight flex-1">
                                              {task.title}
                                            </div>
                                            {task.google_calendar_event_id && (
                                              <i className="fa-brands fa-google text-[8px] text-blue-500 dark:text-blue-300 flex-shrink-0"></i>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Day View */}
          {selectedView === 'day' && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex gap-4">
                {/* Time Column */}
                <div className="w-20 flex-shrink-0">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="h-20 text-sm text-patina-500 dark:text-teal-400 pr-3 text-right pt-2 font-medium">
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </div>
                  ))}
                </div>

                {/* Day Column */}
                <div className="flex-1">
                  <div className="relative">
                    {Array.from({ length: 24 }, (_, hourIndex) => {
                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                      const dayEvents = getEventsForDate(currentDate.getDate());
                      const dayTasks = getTasksForDate(currentDate.getDate());

                      const hourEvents = dayEvents.filter(event => {
                        if (!event.time) return hourIndex === 9;
                        const eventHour = parseInt(event.time.split(':')[0]);
                        return eventHour === hourIndex;
                      });

                      return (
                        <div
                          key={hourIndex}
                          className="h-20 border-t border-patina-100 dark:border-teal-700/30 relative hover:bg-patina-50/40 dark:hover:bg-teal-800/40 transition-colors rounded-lg"
                          onDoubleClick={() => openEventModal(dateStr, undefined, hourIndex)}
                        >
                          <div className="space-y-2 p-2">
                            {hourEvents.map((event) => {
                              const isGoogleSynced = event.googleEventId || event.id.startsWith('google-');
                              return (
                                <div
                                  key={event.id}
                                  className={`px-4 py-3 rounded-xl cursor-pointer hover:shadow-lg transition-all border-l-4 ${
                                    isGoogleSynced
                                      ? 'bg-blue-100 dark:bg-blue-900/70 hover:bg-blue-200 dark:hover:bg-blue-800/80 text-blue-800 dark:text-white'
                                      : 'bg-white/90 dark:bg-teal-800/70 hover:bg-patina-50 dark:hover:bg-teal-700/80 text-patina-800 dark:text-white'
                                  }`}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    openEventModal(dateStr, event);
                                  }}
                                  style={{ borderLeftColor: event.color }}
                                  title={isGoogleSynced ? `${event.title} (Synced to Google Calendar)` : event.title}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: event.color }}
                                    ></div>
                                    <div className="font-semibold text-sm leading-tight flex-1">
                                      {event.time && <span className="opacity-70 mr-2">{event.time}</span>}
                                      {event.title}
                                    </div>
                                    {isGoogleSynced && (
                                      <i className="fa-brands fa-google text-sm text-blue-500 dark:text-blue-300 flex-shrink-0"></i>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {hourIndex === 9 && dayTasks.map((task) => (
                              <div
                                key={task.id}
                                className={`px-4 py-3 rounded-xl border-l-4 ${
                                  task.google_calendar_event_id
                                    ? 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-white'
                                    : 'bg-amber-100/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-100'
                                }`}
                                style={{ borderLeftColor: getPriorityColor(task.priority) }}
                                title={task.google_calendar_event_id ? `${task.title} (Synced to Google Calendar)` : task.title}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                                  ></div>
                                  <div className="font-medium text-sm leading-tight flex-1">
                                    {task.title}
                                  </div>
                                  {task.google_calendar_event_id && (
                                    <i className="fa-brands fa-google text-sm text-blue-500 dark:text-blue-300 flex-shrink-0"></i>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={closeEventModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="modal-title">
                  {selectedEvent
                    ? selectedEvent.id.startsWith('google-')
                      ? 'Google Calendar Event'
                      : 'Edit Event'
                    : 'New Event'}
                </h2>
                {selectedEvent?.id.startsWith('google-') && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium backdrop-blur-sm">
                    <i className="fa-brands fa-google text-[10px]"></i>
                    Google
                  </span>
                )}
                {selectedEvent?.googleEventId && !selectedEvent.id.startsWith('google-') && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium backdrop-blur-sm">
                    <i className="fa-solid fa-check text-[10px]"></i>
                    Synced
                  </span>
                )}
              </div>
              <button
                onClick={closeEventModal}
                className="modal-close-btn"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>

            <div className="space-y-5">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-2">
                  {selectedEvent?.id.startsWith('google-') ? 'Event Title' : 'Event Title *'}
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Enter event title..."
                  disabled={selectedEvent?.id.startsWith('google-')}
                  className={`modal-input ${
                    selectedEvent?.id.startsWith('google-') ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  autoFocus={!selectedEvent?.id.startsWith('google-')}
                />
              </div>

              {/* Date Selection - hide for Google events */}
              {!selectedEvent?.id.startsWith('google-') && (
                <div>
                  <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-3">
                    <CalendarIcon className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
                    Select Date
                  </label>
                  {/* Date Presets */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: 'Today', getValue: () => new Date().toISOString().split('T')[0] },
                      { label: 'Tomorrow', getValue: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return d.toISOString().split('T')[0];
                      }},
                      { label: 'This Weekend', getValue: () => {
                        const d = new Date();
                        const day = d.getDay();
                        const daysUntilSat = day === 0 ? 6 : 6 - day;
                        d.setDate(d.getDate() + daysUntilSat);
                        return d.toISOString().split('T')[0];
                      }},
                      { label: 'Next Week', getValue: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        return d.toISOString().split('T')[0];
                      }},
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSelectedDate(preset.getValue())}
                        className={`preset-btn ${selectedDate === preset.getValue() ? 'preset-btn-active' : ''}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {/* Custom Date Input */}
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="modal-input"
                    />
                    {selectedDate && (
                      <div className="mt-2 text-xs text-patina-600 dark:text-teal-300">
                        Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-3">
                  <i className="fa-regular fa-clock mr-1.5"></i>
                  Select Time
                </label>
                {/* Time Presets - hide for Google events */}
                {!selectedEvent?.id.startsWith('google-') && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: '9 AM', time: '09:00' },
                      { label: '12 PM', time: '12:00' },
                      { label: '2 PM', time: '14:00' },
                      { label: '5 PM', time: '17:00' },
                      { label: '7 PM', time: '19:00' },
                      { label: '9 PM', time: '21:00' },
                    ].map((preset) => (
                      <button
                        key={preset.time}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, time: preset.time })}
                        className={`preset-btn ${eventForm.time === preset.time ? 'preset-btn-active' : ''}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
                {/* Custom Time Input */}
                <div className="relative">
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    disabled={selectedEvent?.id.startsWith('google-')}
                    className={`modal-input ${
                      selectedEvent?.id.startsWith('google-') ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  />
                  {eventForm.time && !selectedEvent?.id.startsWith('google-') && (
                    <button
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, time: '' })}
                      className="mt-2 text-xs text-patina-500 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                    >
                      <i className="fa-solid fa-times"></i>
                      Clear time (make all-day event)
                    </button>
                  )}
                </div>
              </div>

              {/* Event Tag - hide for Google-originated events */}
              {!selectedEvent?.id.startsWith('google-') && (
                <div>
                  <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-2">
                    <i className="fa-solid fa-tag mr-1.5"></i>
                    Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={eventForm.tag}
                    onChange={(e) => setEventForm({ ...eventForm, tag: e.target.value })}
                    placeholder="e.g., Meeting, Birthday, Deadline..."
                    className="modal-input"
                  />
                </div>
              )}

              {/* Recurrence Options - hide for Google-originated events */}
              {!selectedEvent?.id.startsWith('google-') && (
                <div>
                  <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-3">
                    <i className="fa-solid fa-repeat mr-1.5"></i>
                    Repeat
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { value: 'none', label: 'Never' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly', label: 'Yearly' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, recurrence: option.value as RecurrenceType })}
                        className={`preset-btn ${eventForm.recurrence === option.value ? 'preset-btn-active' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {eventForm.recurrence !== 'none' && (
                    <div className="mt-3">
                      <label className="block text-xs text-patina-600 dark:text-teal-300 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={eventForm.recurrenceEndDate}
                        onChange={(e) => setEventForm({ ...eventForm, recurrenceEndDate: e.target.value })}
                        min={selectedDate || new Date().toISOString().split('T')[0]}
                        className="modal-input"
                      />
                      {eventForm.recurrenceEndDate && (
                        <button
                          type="button"
                          onClick={() => setEventForm({ ...eventForm, recurrenceEndDate: '' })}
                          className="mt-2 text-xs text-patina-500 dark:text-teal-400 hover:text-patina-700 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                        >
                          <i className="fa-solid fa-times"></i>
                          Clear end date (repeat forever)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Color Picker - hide for Google-originated events */}
              {!selectedEvent?.id.startsWith('google-') && (
                <div>
                  <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-3">
                    <i className="fa-solid fa-palette mr-1.5"></i>
                    Color
                  </label>
                  <div className="flex gap-2.5 flex-wrap p-4 rounded-2xl bg-white/50 dark:bg-teal-900/20 backdrop-blur-sm border border-patina-200/30 dark:border-teal-700/30">
                    {[
                      { color: '#14b8a6', name: 'Teal' },
                      { color: '#3b82f6', name: 'Blue' },
                      { color: '#10b981', name: 'Green' },
                      { color: '#f59e0b', name: 'Amber' },
                      { color: '#ef4444', name: 'Red' },
                      { color: '#8b5cf6', name: 'Purple' },
                      { color: '#ec4899', name: 'Pink' },
                      { color: '#6b7280', name: 'Gray' },
                    ].map(({ color, name }) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, color })}
                        title={name}
                        className={`w-11 h-11 rounded-xl transition-all duration-200 ${
                          eventForm.color === color
                            ? 'ring-3 ring-offset-2 ring-offset-white dark:ring-offset-teal-950 scale-110 shadow-lg'
                            : 'hover:scale-105 shadow-md hover:shadow-lg'
                        }`}
                        style={{
                          backgroundColor: color,
                          '--tw-ring-color': color,
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Google Calendar Sync Toggle */}
              {!selectedEvent?.id.startsWith('google-') && (
                <div className="google-sync-section flex items-center justify-between p-4 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/80 dark:bg-teal-950/60 flex items-center justify-center shadow-sm backdrop-blur-sm border border-blue-100/50 dark:border-teal-700/30">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-patina-700 dark:text-teal-200">
                        Sync to Google Calendar
                        {selectedEvent?.googleEventId && (
                          <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                            <i className="fa-solid fa-check-circle mr-1"></i>Synced
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-patina-500 dark:text-teal-400 mt-0.5">
                        {user?.google_id
                          ? selectedEvent?.googleEventId
                            ? 'This event is linked to your Google Calendar'
                            : 'Add this event to your Google Calendar'
                          : 'Sign in with Google to enable sync'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.syncToGoogle}
                      onChange={(e) => setEventForm({ ...eventForm, syncToGoogle: e.target.checked })}
                      disabled={!user?.google_id}
                      className="sr-only peer"
                    />
                    <div className={`w-12 h-7 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-teal-500 transition-all duration-300 ${
                      user?.google_id
                        ? 'bg-patina-200/80 dark:bg-teal-600/80 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 dark:peer-checked:from-teal-400 dark:peer-checked:to-teal-500'
                        : 'bg-patina-100/50 dark:bg-teal-700/50 cursor-not-allowed'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-teal-100 rounded-full shadow-md transition-all duration-300 ${
                        eventForm.syncToGoogle ? 'translate-x-5' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </label>
                </div>
              )}

              {/* Info for Google-originated events */}
              {selectedEvent?.id.startsWith('google-') && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-700/30 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <i className="fa-brands fa-google text-blue-500 dark:text-blue-400"></i>
                  </div>
                  <p className="text-sm text-patina-600 dark:text-teal-300">
                    This event was created in Google Calendar. You can delete it here, but to edit it, please use Google Calendar directly.
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-6 border-t border-patina-200/30 dark:border-teal-700/30 mt-6">
                {selectedEvent && (
                  <button
                    onClick={handleDeleteEvent}
                    disabled={isSavingEvent}
                    className="px-5 py-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-500 dark:hover:to-red-600 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <i className="fa-solid fa-trash mr-2"></i>
                    Delete
                  </button>
                )}
                <button
                  onClick={closeEventModal}
                  disabled={isSavingEvent}
                  className={`px-5 py-3 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    bg-white/60 dark:bg-teal-900/40 border-patina-200/50 dark:border-teal-600/40 text-patina-700 dark:text-teal-200
                    hover:bg-white/80 dark:hover:bg-teal-800/50 hover:border-patina-300/60 dark:hover:border-teal-500/50 ${
                    selectedEvent?.id.startsWith('google-') ? 'flex-1' : ''
                  }`}
                >
                  {selectedEvent?.id.startsWith('google-') ? 'Close' : 'Cancel'}
                </button>
                {/* Hide save/update button for Google-originated events */}
                {!selectedEvent?.id.startsWith('google-') && (
                  <button
                    onClick={handleSaveEvent}
                    disabled={isSavingEvent}
                    className="flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-200 text-white
                      bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-500 dark:to-teal-600
                      hover:from-patina-600 hover:to-teal-700 dark:hover:from-teal-400 dark:hover:to-teal-500
                      shadow-lg shadow-patina-500/25 dark:shadow-teal-500/40 hover:shadow-patina-500/40 dark:hover:shadow-teal-400/50
                      hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSavingEvent ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className={`fa-solid ${selectedEvent ? 'fa-check' : 'fa-plus'} mr-2`}></i>
                        {selectedEvent ? 'Update Event' : 'Create Event'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDeleteEvent}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200/80 dark:from-red-500/30 dark:to-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20 backdrop-blur-sm">
                <i className="fa-solid fa-exclamation-triangle text-red-500 dark:text-red-400 text-3xl"></i>
              </div>
              <h3 className="modal-title mb-3">Delete Event?</h3>
              <p className="text-patina-600 dark:text-teal-300 mb-8 text-base leading-relaxed">
                Are you sure you want to delete &ldquo;<span className="font-semibold text-patina-800 dark:text-teal-100">{selectedEvent?.title}</span>&rdquo;? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={cancelDeleteEvent}
                  className="flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border hover:scale-[1.02] active:scale-95
                    bg-white/60 dark:bg-teal-900/40 border-patina-200/50 dark:border-teal-600/40 text-patina-700 dark:text-teal-200
                    hover:bg-white/80 dark:hover:bg-teal-800/50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  disabled={isSavingEvent}
                  className="flex-1 px-5 py-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-500 dark:hover:to-red-600 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSavingEvent ? (
                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Deleting...</>
                  ) : (
                    <><i className="fa-solid fa-trash mr-2"></i>Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
