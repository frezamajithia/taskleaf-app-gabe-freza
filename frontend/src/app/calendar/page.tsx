'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { tasksAPI, calendarAPI } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  category?: {
    id: number;
    name: string;
    color: string;
  };
  weather_data?: any;
  location?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  tag?: string;
  color: string;
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
    color: '#14b8a6'
  });

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
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await calendarAPI.getEvents({
        timeMin: firstDay.toISOString(),
        timeMax: lastDay.toISOString(),
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

  const handleGoogleCalendarSync = () => {
    if (user?.google_id) {
      fetchGoogleCalendarEvents();
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
        color: event.color
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
        color: '#14b8a6'
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
      color: '#14b8a6'
    });
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    const eventDate = selectedDate || new Date().toISOString().split('T')[0];

    if (selectedEvent) {
      setEvents(events.map(e =>
        e.id === selectedEvent.id
          ? { ...e, title: eventForm.title, time: eventForm.time, tag: eventForm.tag, color: eventForm.color }
          : e
      ));
    } else {
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
  };

  const handleDeleteEvent = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteEvent = () => {
    if (selectedEvent) {
      setEvents(events.filter(e => e.id !== selectedEvent.id));
      setShowDeleteModal(false);
      closeEventModal();
    }
  };

  const cancelDeleteEvent = () => {
    setShowDeleteModal(false);
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const localEvents = events.filter(event => event.date === dateStr);
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
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
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

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    while (days.length < 42) {
      days.push(null);
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

  // Get short date format for header
  const getShortDateDisplay = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return currentDate.toLocaleDateString('en-US', options);
  };

  // Calendar Actions - iOS-style segmented control + navigation
  const calendarActions = (
    <div className="flex items-center gap-4">
      {/* Google Calendar Sync Button */}
      <button
        onClick={handleGoogleCalendarSync}
        disabled={isSyncingGoogle}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
          user?.google_id
            ? 'bg-white/70 dark:!bg-teal-900/50 text-patina-700 dark:text-teal-200 border border-patina-200/50 dark:border-teal-700/40 hover:bg-white/80 dark:hover:!bg-teal-800/60 shadow-md hover:shadow-lg backdrop-blur-sm'
            : 'bg-white/70 dark:!bg-teal-900/50 text-patina-700 dark:text-teal-200 border-2 border-blue-400 dark:border-blue-500 hover:bg-blue-50 dark:hover:!bg-teal-800/60 shadow-md hover:shadow-lg animate-pulse backdrop-blur-sm'
        }`}
        title={user?.google_id ? 'Sync Google Calendar' : 'Connect Google Calendar'}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {isSyncingGoogle ? (
          <span>Syncing...</span>
        ) : user?.google_id ? (
          <span>Sync Google</span>
        ) : (
          <span>Connect Google</span>
        )}
      </button>

      {/* Date Navigation with arrows directly adjacent to date */}
      <div className="flex items-center gap-2">
        <button
          onClick={
            selectedView === 'month'
              ? goToPreviousMonth
              : selectedView === 'week'
              ? goToPreviousWeek
              : goToPreviousDay
          }
          className="icon-btn"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-lg font-semibold text-patina-700 dark:text-teal-100 min-w-[200px] text-center">
          {getShortDateDisplay()}
        </span>
        <button
          onClick={
            selectedView === 'month'
              ? goToNextMonth
              : selectedView === 'week'
              ? goToNextWeek
              : goToNextDay
          }
          className="icon-btn"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={goToToday}
          className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium ml-2"
        >
          Today
        </button>
      </div>

      {/* iOS-style segmented control for view switching */}
      <div className="inline-flex rounded-xl bg-white/60 dark:bg-teal-950/30 p-1 backdrop-blur-sm border border-patina-200/50 dark:border-teal-700/40">
        <button
          onClick={() => setSelectedView('day')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            selectedView === 'day'
              ? 'bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white shadow-md'
              : 'text-patina-700 dark:text-teal-200 hover:bg-white/40 dark:hover:bg-teal-900/30'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => setSelectedView('week')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            selectedView === 'week'
              ? 'bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white shadow-md'
              : 'text-patina-700 dark:text-teal-200 hover:bg-white/40 dark:hover:bg-teal-900/30'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setSelectedView('month')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            selectedView === 'month'
              ? 'bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white shadow-md'
              : 'text-patina-700 dark:text-teal-200 hover:bg-white/40 dark:hover:bg-teal-900/30'
          }`}
        >
          Month
        </button>
      </div>
    </div>
  );

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
      {/* Calendar Container */}
      <div className="h-[calc(100vh-160px)]">
        <div className="glass-card rounded-3xl py-6 px-8 h-full flex flex-col overflow-hidden">
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-4 flex-shrink-0">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div
                key={day}
                className="text-center py-2 text-xs font-semibold text-patina-600 dark:text-teal-400 uppercase tracking-wide"
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Month View */}
          {selectedView === 'month' && (
            <div className="grid grid-cols-7 grid-rows-6 gap-3 flex-1 overflow-hidden">
              {generateCalendarDays().map((day, index) => {
                const dayTasks = day ? getTasksForDate(day) : [];
                const dayEvents = day ? getEventsForDate(day) : [];
                const isTodayCell = day ? isToday(day) : false;
                const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';

                return (
                  <div
                    key={index}
                    className={`rounded-2xl p-3 flex flex-col overflow-hidden transition-all duration-200 ${
                      day
                        ? isTodayCell
                          ? 'bg-gradient-to-br from-patina-100 to-teal-100 dark:!bg-gradient-to-br dark:!from-teal-800/80 dark:!to-teal-700/70 border-2 border-patina-400 dark:border-teal-400 shadow-lg shadow-patina-200 dark:shadow-teal-800/50'
                          : 'bg-white/70 dark:!bg-teal-800/50 border border-patina-200 dark:border-teal-600/70 hover:bg-white/90 dark:hover:!bg-teal-700/70 hover:shadow-md hover:scale-[1.02] cursor-pointer backdrop-blur-sm'
                        : 'opacity-0 pointer-events-none'
                    }`}
                    onDoubleClick={() => {
                      if (day) {
                        openEventModal(dateStr);
                      }
                    }}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-2 flex-shrink-0">
                          <span
                            className={`text-sm font-semibold leading-none ${
                              isTodayCell
                                ? 'bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md'
                                : 'text-patina-700 dark:text-teal-100'
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                        <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                          {/* Display Events */}
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="px-1.5 py-0.5 rounded-md cursor-pointer transition-all duration-200 bg-white dark:!bg-teal-600/90 hover:bg-patina-50 dark:hover:!bg-teal-500 border border-patina-300 dark:!border-teal-400 hover:shadow-sm"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                openEventModal(dateStr, event);
                              }}
                              title={event.title}
                            >
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: event.color }}
                                ></div>
                                <div className="font-medium text-patina-900 dark:!text-white text-[10px] leading-tight truncate flex-1">
                                  {event.title}
                                </div>
                              </div>
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[9px] text-patina-500 dark:text-teal-400 px-1.5 py-0.5 font-medium">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                          {/* Display Tasks */}
                          {dayTasks.slice(0, 1).map((task) => (
                            <div
                              key={task.id}
                              className="px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-teal-900/30 border border-patina-100/50 dark:border-teal-700/50"
                              title={task.title}
                            >
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                                ></div>
                                <div className="font-medium text-patina-700 dark:text-teal-200 text-[10px] leading-tight truncate flex-1">
                                  {task.title}
                                </div>
                              </div>
                            </div>
                          ))}
                          {dayTasks.length > 1 && (
                            <div className="text-[9px] text-patina-500 dark:text-teal-400 px-1.5 py-0.5 font-medium">
                              +{dayTasks.length - 1} task{dayTasks.length - 1 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
                      const localWeekEvents = events.filter(event => event.date === dateStr);
                      const gWeekEvents = showGoogleEvents ? googleEvents.filter(event => event.date === dateStr) : [];
                      const weekDayEvents = [...localWeekEvents, ...gWeekEvents];
                      const weekDayTasks = tasks.filter((task) => {
                        if (!task.due_date) return false;
                        const taskDate = new Date(task.due_date);
                        return taskDate.toDateString() === dayDate.toDateString();
                      });

                      return (
                        <div key={dayIndex} className="flex flex-col">
                          {/* Day Header */}
                          <div className={`h-14 flex flex-col items-center justify-center mb-2 rounded-xl transition-all ${
                            isTodayDay
                              ? 'bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 shadow-md'
                              : 'bg-white/50 dark:!bg-teal-900/40 border border-patina-100 dark:border-teal-800/30'
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
                                  className="h-14 border-t border-patina-100/50 dark:border-teal-800/30 relative hover:bg-patina-50/30 dark:hover:!bg-teal-800/40 transition-colors"
                                  onDoubleClick={() => openEventModal(dateStr, undefined, hourIndex)}
                                >
                                  {(hourEvents.length > 0 || (hourIndex === 9 && weekDayTasks.length > 0)) && (
                                    <div className="space-y-1 p-1">
                                      {hourEvents.map((event) => (
                                        <div
                                          key={event.id}
                                          className="px-2 py-1 rounded-md cursor-pointer bg-white/90 dark:!bg-teal-700/70 hover:bg-patina-50 dark:hover:!bg-teal-600/80 border-l-2 transition-all shadow-sm"
                                          onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            openEventModal(dateStr, event);
                                          }}
                                          style={{ borderLeftColor: event.color }}
                                        >
                                          <div className="text-xs font-semibold text-patina-800 dark:text-teal-100 truncate leading-tight">
                                            {event.time && <span className="text-patina-500 dark:text-teal-400 mr-1">{event.time}</span>}
                                            {event.title}
                                          </div>
                                        </div>
                                      ))}
                                      {hourIndex === 9 && weekDayTasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className="px-2 py-1 rounded-md bg-white/70 dark:!bg-teal-800/70 border-l-2"
                                          style={{ borderLeftColor: getPriorityColor(task.priority) }}
                                        >
                                          <div className="text-xs font-medium text-patina-700 dark:!text-teal-100 truncate leading-tight">
                                            {task.title}
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
                          className="h-20 border-t border-patina-100 dark:border-teal-800/30 relative hover:bg-patina-50/40 dark:hover:!bg-teal-800/40 transition-colors rounded-lg"
                          onDoubleClick={() => openEventModal(dateStr, undefined, hourIndex)}
                        >
                          <div className="space-y-2 p-2">
                            {hourEvents.map((event) => (
                              <div
                                key={event.id}
                                className="px-4 py-3 rounded-xl cursor-pointer bg-white/90 dark:!bg-teal-700/70 hover:shadow-lg hover:bg-patina-50 dark:hover:!bg-teal-600/80 transition-all border-l-4"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  openEventModal(dateStr, event);
                                }}
                                style={{ borderLeftColor: event.color }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: event.color }}
                                  ></div>
                                  <div className="font-semibold text-patina-800 dark:text-teal-100 text-sm leading-tight flex-1">
                                    {event.time && <span className="text-patina-500 dark:text-teal-400 mr-2">{event.time}</span>}
                                    {event.title}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {hourIndex === 9 && dayTasks.map((task) => (
                              <div
                                key={task.id}
                                className="px-4 py-3 rounded-xl bg-white/80 dark:!bg-teal-800/70 border-l-4"
                                style={{ borderLeftColor: getPriorityColor(task.priority) }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                                  ></div>
                                  <div className="font-medium text-patina-700 dark:text-teal-200 text-sm leading-tight flex-1">
                                    {task.title}
                                  </div>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="modal-title">
                {selectedEvent ? 'Edit Event' : 'New Event'}
              </h2>
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
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Enter event title..."
                  className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
                  autoFocus
                />
              </div>

              {/* Event Time */}
              <div>
                <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-2">
                  Time (Optional)
                </label>
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
                />
              </div>

              {/* Event Tag */}
              <div>
                <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-2">
                  Tag (Optional)
                </label>
                <input
                  type="text"
                  value={eventForm.tag}
                  onChange={(e) => setEventForm({ ...eventForm, tag: e.target.value })}
                  placeholder="e.g., Meeting, Birthday, Deadline..."
                  className="w-full px-4 py-3 rounded-xl border border-patina-200/50 dark:border-teal-700/50 bg-white dark:bg-teal-950/40 text-patina-800 dark:text-teal-100 placeholder:text-patina-400 dark:placeholder:text-teal-500 focus:outline-none focus:ring-2 focus:ring-patina-400/50 dark:focus:ring-teal-500/50 transition-all"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-semibold text-patina-700 dark:text-teal-200 mb-3">
                  Color
                </label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    '#14b8a6', // teal
                    '#3b82f6', // blue
                    '#10b981', // green
                    '#f59e0b', // amber
                    '#ef4444', // red
                    '#8b5cf6', // purple
                    '#ec4899', // pink
                    '#6b7280', // gray
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, color })}
                      className={`w-12 h-12 rounded-full transition-all ${
                        eventForm.color === color
                          ? 'ring-4 ring-patina-300 dark:ring-teal-500 scale-110 shadow-lg'
                          : 'hover:scale-105 shadow-md'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                {selectedEvent && (
                  <button
                    onClick={handleDeleteEvent}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                  >
                    <i className="fa-solid fa-trash mr-2"></i>
                    Delete
                  </button>
                )}
                <button
                  onClick={closeEventModal}
                  className="flex-1 btn-secondary px-6 py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  className="flex-1 btn-primary px-6 py-3 rounded-xl"
                >
                  {selectedEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDeleteEvent}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
                <i className="fa-solid fa-exclamation-triangle text-red-500 dark:text-red-400 text-3xl"></i>
              </div>
              <h3 className="modal-title mb-3">Delete Event?</h3>
              <p className="text-patina-600 dark:text-teal-300 mb-8 text-base">
                Are you sure you want to delete &ldquo;{selectedEvent?.title}&rdquo;? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={cancelDeleteEvent}
                  className="flex-1 btn-secondary px-6 py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
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

      {/* Floating Action Button */}
      <button
        onClick={() => openEventModal()}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-patina-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl shadow-lg shadow-patina-500/40 dark:shadow-teal-600/40 z-50"
        title="Add Event"
      >
        <Plus className="h-6 w-6" />
      </button>
    </AppShell>
  );
}
