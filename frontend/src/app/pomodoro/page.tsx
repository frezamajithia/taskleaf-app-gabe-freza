'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { pomodoroAPI } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export default function PomodoroPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode, initializeTheme } = useThemeStore();
  
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const minuteTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeTheme();
    loadUser();
  }, [initializeTheme, loadUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadTodayStats();
    checkActiveSession();
  }, [isAuthenticated, authLoading, router]);

  // Timer effect - counts down seconds
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Minute tracker - updates backend every minute
  useEffect(() => {
    if (isRunning && currentSessionId && mode === 'work') {
      // Track when a minute has elapsed
      const targetTime = mode === 'work' ? WORK_TIME : mode === 'shortBreak' ? SHORT_BREAK : LONG_BREAK;
      const secondsElapsed = targetTime - timeLeft;
      const currentMinute = Math.floor(secondsElapsed / 60);
      
      if (currentMinute > elapsedMinutes) {
        setElapsedMinutes(currentMinute);
        updateSessionMinutes(currentMinute);
      }
    }
  }, [timeLeft, isRunning, currentSessionId, mode, elapsedMinutes]);

  const checkActiveSession = async () => {
    try {
      const response = await pomodoroAPI.getActiveSession();
      if (response.data) {
        // Resume active session
        setCurrentSessionId(response.data.id);
        setElapsedMinutes(response.data.elapsed_minutes);
        const remainingSeconds = (response.data.target_duration - response.data.elapsed_minutes) * 60;
        setTimeLeft(remainingSeconds);
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
    }
  };

  const loadTodayStats = async () => {
    try {
      const response = await pomodoroAPI.getStats();
      const stats = response.data;
      setTodaySessions(stats.today_sessions);
      setTotalFocusTime(stats.today_focus_minutes);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const updateSessionMinutes = async (minutes: number) => {
    if (!currentSessionId) return;
    
    try {
      await pomodoroAPI.updateSession(currentSessionId, {
        elapsed_minutes: minutes,
        is_completed: false
      });
      
      // Refresh stats to update focus time display
      await loadTodayStats();
    } catch (error) {
      console.error('Failed to update session minutes:', error);
    }
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    playNotificationSound();
    
    if (mode === 'work' && currentSessionId) {
      // Mark session as completed
      const finalMinutes = Math.ceil((WORK_TIME - timeLeft) / 60);
      try {
        await pomodoroAPI.updateSession(currentSessionId, {
          elapsed_minutes: finalMinutes,
          is_completed: true
        });
        
        // Reload stats
        await loadTodayStats();
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
      
      setCompletedPomodoros(prev => prev + 1);
      setCurrentSessionId(null);
      setElapsedMinutes(0);
      
      // Switch to break
      if ((completedPomodoros + 1) % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setMode('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
    } else {
      // Break complete, back to work
      setMode('work');
      setTimeLeft(WORK_TIME);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  const toggleTimer = async () => {
    if (!isRunning && mode === 'work' && !currentSessionId) {
      // Starting a new work session - create it in backend
      try {
        const response = await pomodoroAPI.createSession({
          session_type: 'work',
          target_duration: 25
        });
        setCurrentSessionId(response.data.id);
        setElapsedMinutes(0);
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : mode === 'shortBreak' ? SHORT_BREAK : LONG_BREAK);
    
    // If there's an active session, delete it
    if (currentSessionId) {
      try {
        await pomodoroAPI.deleteSession(currentSessionId);
        setCurrentSessionId(null);
        setElapsedMinutes(0);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const switchMode = async (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(
      newMode === 'work' ? WORK_TIME :
      newMode === 'shortBreak' ? SHORT_BREAK :
      LONG_BREAK
    );
    
    // Clear any active session when switching modes
    if (currentSessionId) {
      try {
        await pomodoroAPI.deleteSession(currentSessionId);
        setCurrentSessionId(null);
        setElapsedMinutes(0);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const total = mode === 'work' ? WORK_TIME : mode === 'shortBreak' ? SHORT_BREAK : LONG_BREAK;
    return ((total - timeLeft) / total) * 100;
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const modeConfig = {
    work: {
      title: 'Focus Time',
      icon: 'fa-brain',
      color: 'from-patina-400 to-patina-600 dark:from-teal-500 dark:to-patina-600',
      bgColor: 'from-patina-50 to-teal-50 dark:from-gray-900 dark:to-teal-900'
    },
    shortBreak: {
      title: 'Short Break',
      icon: 'fa-coffee',
      color: 'from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-600',
      bgColor: 'from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-blue-900'
    },
    longBreak: {
      title: 'Long Break',
      icon: 'fa-spa',
      color: 'from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-600',
      bgColor: 'from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900'
    }
  };

  const currentConfig = modeConfig[mode];

  return (
    <AppShell
      title="Pomodoro Timer"
      description="Stay focused and productive"
      user={user}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
    >
      <div className="space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-200 to-red-300 dark:from-red-600 dark:to-red-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-check-double text-red-600 dark:text-red-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">Today</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">{todaySessions}</h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Completed Sessions</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 dark:from-orange-600 dark:to-orange-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-fire text-orange-600 dark:text-orange-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">Current</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">{completedPomodoros}</h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Session Streak</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-600 dark:to-blue-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-clock text-blue-600 dark:text-blue-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">Today</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">
              {totalFocusTime}m
            </h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Total Focus Time</p>
            {mode === 'work' && isRunning && (
              <p className="text-xs text-patina-500 dark:text-teal-400 mt-2">
                +{elapsedMinutes}m this session
              </p>
            )}
          </div>
        </div>

        {/* Main Timer Card */}
        <div className="glass-card rounded-3xl p-8 lg:p-12">
          {/* Mode Selector */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => switchMode('work')}
              disabled={isRunning}
              className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                mode === 'work'
                  ? 'bg-gradient-to-r from-patina-400 to-patina-500 dark:from-teal-500 dark:to-patina-600 text-white shadow-lg'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-600 dark:text-teal-300 hover:bg-patina-200/60 dark:hover:bg-teal-800/40'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <i className="fa-solid fa-brain mr-2"></i>
              Focus
            </button>
            <button
              onClick={() => switchMode('shortBreak')}
              disabled={isRunning}
              className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                mode === 'shortBreak'
                  ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-600 dark:text-teal-300 hover:bg-patina-200/60 dark:hover:bg-teal-800/40'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <i className="fa-solid fa-coffee mr-2"></i>
              Short Break
            </button>
            <button
              onClick={() => switchMode('longBreak')}
              disabled={isRunning}
              className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                mode === 'longBreak'
                  ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-lg'
                  : 'bg-patina-100/50 dark:bg-teal-900/30 text-patina-600 dark:text-teal-300 hover:bg-patina-200/60 dark:hover:bg-teal-800/40'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <i className="fa-solid fa-spa mr-2"></i>
              Long Break
            </button>
          </div>

          {/* Timer Display */}
          <div className="flex flex-col items-center">
            <div className="relative w-80 h-80 mb-8">
              {/* Progress Circle */}
              <svg className="transform -rotate-90 w-80 h-80">
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-patina-200/30 dark:text-teal-800/30"
                />
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 140}`}
                  strokeDashoffset={`${2 * Math.PI * 140 * (1 - getProgress() / 100)}`}
                  className={`transition-all duration-1000 ${
                    mode === 'work' ? 'text-patina-500 dark:text-teal-400' :
                    mode === 'shortBreak' ? 'text-blue-500 dark:text-blue-400' :
                    'text-purple-500 dark:text-purple-400'
                  }`}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Time Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <i className={`fa-solid ${currentConfig.icon} text-4xl mb-4 text-patina-600 dark:text-teal-300`}></i>
                <div className="text-7xl font-bold text-patina-700 dark:text-teal-100 mb-2 font-mono">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-lg text-patina-600 dark:text-teal-300 font-medium">
                  {currentConfig.title}
                </p>
                {mode === 'work' && isRunning && (
                  <p className="text-sm text-patina-500 dark:text-teal-400 mt-2">
                    {elapsedMinutes} minutes tracked
                  </p>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4">
              <button
                onClick={toggleTimer}
                className={`px-12 py-4 rounded-2xl font-semibold text-white text-lg transition-all duration-300 shadow-xl hover:scale-105 bg-gradient-to-r ${currentConfig.color}`}
              >
                <i className={`fa-solid ${isRunning ? 'fa-pause' : 'fa-play'} mr-3`}></i>
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetTimer}
                className="px-8 py-4 rounded-2xl font-semibold text-patina-700 dark:text-teal-100 bg-patina-100/50 dark:bg-teal-900/30 hover:bg-patina-200/60 dark:hover:bg-teal-800/40 transition-all duration-300"
              >
                <i className="fa-solid fa-rotate-right mr-2"></i>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-600 dark:to-green-500 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-lightbulb text-green-600 dark:text-green-100"></i>
            </div>
            <h4 className="text-sm font-semibold text-patina-700 dark:text-teal-100 mb-2">Focus Deeply</h4>
            <p className="text-xs text-patina-600 dark:text-teal-300">Eliminate distractions and concentrate on one task</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-600 dark:to-blue-500 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-battery-full text-blue-600 dark:text-blue-100"></i>
            </div>
            <h4 className="text-sm font-semibold text-patina-700 dark:text-teal-100 mb-2">Take Breaks</h4>
            <p className="text-xs text-patina-600 dark:text-teal-300">Rest is essential for sustained productivity</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-600 dark:to-purple-500 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-chart-line text-purple-600 dark:text-purple-100"></i>
            </div>
            <h4 className="text-sm font-semibold text-patina-700 dark:text-teal-100 mb-2">Track Progress</h4>
            <p className="text-xs text-patina-600 dark:text-teal-300">Monitor your focus sessions daily</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 dark:from-orange-600 dark:to-orange-500 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-repeat text-orange-600 dark:text-orange-100"></i>
            </div>
            <h4 className="text-sm font-semibold text-patina-700 dark:text-teal-100 mb-2">Stay Consistent</h4>
            <p className="text-xs text-patina-600 dark:text-teal-300">Build a daily routine for best results</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}