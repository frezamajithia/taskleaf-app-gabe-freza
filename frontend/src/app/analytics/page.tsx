'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/themeStore';
import { tasksAPI } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import HighchartsSolidGauge from 'highcharts/modules/solid-gauge';

// Initialize Highcharts modules
if (typeof window !== 'undefined') {
  HighchartsMore(Highcharts);
  HighchartsSolidGauge(Highcharts);
}

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
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode, initializeTheme } = useThemeStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const completionChartRef = useRef<HTMLDivElement>(null);
  const categoryChartRef = useRef<HTMLDivElement>(null);
  const productivityGaugeRef = useRef<HTMLDivElement>(null);
  const focusChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeTheme();
    loadUser();
  }, [initializeTheme, loadUser]);

  useEffect(() => {
    // Don't redirect while still loading user data
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchTasks();
  }, [isAuthenticated, authLoading, router]);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeCharts = useCallback(() => {
    // Dark mode colors
    const labelColor = isDarkMode ? '#8BBDB5' : '#609A93';
    const gridColor = isDarkMode ? 'rgba(139, 189, 181, 0.1)' : 'rgba(183, 216, 210, 0.1)';
    const primaryColor = isDarkMode ? '#5EEAD4' : '#609A93';
    const textColor = isDarkMode ? '#B7D8D2' : '#305552';

    // Task Completion Trend Chart
    if (completionChartRef.current) {
      Highcharts.chart(completionChartRef.current, {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          height: 240
        },
        title: { text: undefined },
        credits: { enabled: false },
        xAxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          gridLineWidth: 0,
          lineWidth: 0,
          tickWidth: 0,
          labels: { style: { color: labelColor, fontSize: '12px' } }
        },
        yAxis: {
          title: { text: undefined },
          gridLineWidth: 1,
          gridLineColor: gridColor,
          labels: { style: { color: labelColor, fontSize: '12px' } }
        },
        legend: { enabled: false },
        plotOptions: {
          line: {
            marker: {
              enabled: true,
              radius: 4,
              fillColor: primaryColor
            },
            lineWidth: 3
          }
        },
        series: [{
          name: 'Completion %',
          data: [75, 82, 89, 91, 87, 93, 95],
          color: primaryColor,
          type: 'line'
        }]
      });
    }

    // Category Breakdown Donut Chart
    if (categoryChartRef.current) {
      const categoryColors = isDarkMode
        ? ['#5EEAD4', '#4DD4BE', '#3CBCA6', '#2BA48E']
        : ['#609A93', '#8BBDB5', '#B7D8D2', '#DBECE8'];

      Highcharts.chart(categoryChartRef.current, {
        chart: {
          type: 'pie',
          backgroundColor: 'transparent',
          height: 240
        },
        title: { text: undefined },
        credits: { enabled: false },
        plotOptions: {
          pie: {
            innerSize: '60%',
            dataLabels: {
              enabled: true,
              format: '{point.name}: {point.percentage:.1f}%',
              style: {
                color: labelColor,
                fontSize: '11px',
                textOutline: 'none',
                fontWeight: '500'
              },
              distance: 10
            }
          }
        },
        series: [{
          name: 'Categories',
          type: 'pie',
          data: [
            { name: 'Work', y: 45, color: categoryColors[0] },
            { name: 'Personal', y: 25, color: categoryColors[1] },
            { name: 'Learning', y: 20, color: categoryColors[2] },
            { name: 'Health', y: 10, color: categoryColors[3] }
          ]
        }]
      });
    }

    // Productivity Gauge
    if (productivityGaugeRef.current) {
      const gaugeStops: [number, string][] = isDarkMode
        ? [[0.1, '#2BA48E'], [0.5, '#4DD4BE'], [0.9, '#5EEAD4']]
        : [[0.1, '#DBECE8'], [0.5, '#8BBDB5'], [0.9, '#609A93']];
      const gaugeBackground = isDarkMode ? 'rgba(139, 189, 181, 0.1)' : 'rgba(183, 216, 210, 0.1)';

      Highcharts.chart(productivityGaugeRef.current, {
        chart: {
          type: 'solidgauge',
          backgroundColor: 'transparent',
          height: 180
        },
        title: { text: undefined },
        credits: { enabled: false },
        pane: {
          center: ['50%', '70%'],
          size: '120%',
          startAngle: -90,
          endAngle: 90,
          background: [{
            backgroundColor: gaugeBackground,
            innerRadius: '60%',
            outerRadius: '100%',
            shape: 'arc'
          }]
        },
        yAxis: {
          min: 0,
          max: 100,
          stops: gaugeStops,
          lineWidth: 0,
          tickWidth: 0,
          minorTickInterval: undefined,
          tickAmount: 2,
          labels: { y: 16, style: { color: labelColor, fontSize: '12px' } }
        },
        plotOptions: {
          solidgauge: {
            dataLabels: {
              y: 5,
              borderWidth: 0,
              useHTML: true
            }
          }
        },
        series: [{
          name: 'Productivity',
          type: 'solidgauge',
          data: [87],
          dataLabels: {
            format: `<div style="text-align:center"><span style="font-size:24px;color:${textColor};font-weight:bold">{y}</span><br/><span style="font-size:12px;color:${labelColor};opacity:0.7">Score</span></div>`
          }
        }]
      });
    }

    // Weekly Focus Hours Bar Chart
    if (focusChartRef.current) {
      Highcharts.chart(focusChartRef.current, {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          height: 180
        },
        title: { text: undefined },
        credits: { enabled: false },
        xAxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          gridLineWidth: 0,
          lineWidth: 0,
          tickWidth: 0,
          labels: { style: { color: labelColor, fontSize: '11px' } }
        },
        yAxis: {
          title: { text: undefined },
          gridLineWidth: 1,
          gridLineColor: gridColor,
          labels: { style: { color: labelColor, fontSize: '11px' } }
        },
        legend: { enabled: false },
        plotOptions: {
          column: {
            borderRadius: 4,
            pointPadding: 0.2,
            groupPadding: 0.1
          }
        },
        series: [{
          name: 'Focus Hours',
          type: 'column',
          data: [5.2, 6.1, 4.8, 7.2, 6.5, 3.8, 5.9],
          color: primaryColor
        }]
      });
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      initializeCharts();
    }
  }, [loading, initializeCharts]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || !isAuthenticated || loading) {
    return null;
  }

  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 87;

  return (
    <AppShell
      title="Analytics"
      description="Track your productivity insights"
      user={user}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
    >
      <div className="space-y-8">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-patina-200 to-patina-300 dark:from-patina-600 dark:to-teal-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-check text-patina-600 dark:text-teal-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">This Week</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">{completionRate}%</h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Task Completion</p>
            <div className="mt-4 flex items-center text-xs">
              <i className="fa-solid fa-arrow-up text-green-500 dark:text-green-400 mr-1"></i>
              <span className="text-green-600 dark:text-green-400">+12% from last week</span>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-600 dark:to-blue-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-clock text-blue-600 dark:text-blue-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">Today</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">6.2h</h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Focus Time</p>
            <div className="mt-4 flex items-center text-xs">
              <i className="fa-solid fa-arrow-up text-green-500 dark:text-green-400 mr-1"></i>
              <span className="text-green-600 dark:text-green-400">+0.8h from yesterday</span>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 dark:from-orange-600 dark:to-orange-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-fire text-orange-600 dark:text-orange-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">Current</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">12</h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Day Streak</p>
            <div className="mt-4 flex items-center text-xs">
              <i className="fa-solid fa-arrow-up text-green-500 dark:text-green-400 mr-1"></i>
              <span className="text-green-600 dark:text-green-400">Personal best!</span>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-600 dark:to-purple-500 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-target text-purple-600 dark:text-purple-100"></i>
              </div>
              <span className="text-xs text-patina-500 dark:text-teal-400 opacity-70">This Month</span>
            </div>
            <h3 className="text-2xl font-bold text-patina-700 dark:text-teal-100 mb-2">94%</h3>
            <p className="text-sm text-patina-600 dark:text-teal-300">Goal Achievement</p>
            <div className="mt-4 flex items-center text-xs">
              <i className="fa-solid fa-arrow-up text-green-500 dark:text-green-400 mr-1"></i>
              <span className="text-green-600 dark:text-green-400">+7% from last month</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-100">Task Completion Trend</h3>
              <div className="flex space-x-2">
                <button className="px-4 py-2 text-xs text-patina-600 dark:text-teal-300 rounded-xl bg-patina-100/50 dark:bg-teal-900/30 hover:bg-patina-200/60 dark:hover:bg-teal-800/40 transition-colors">7D</button>
                <button className="px-4 py-2 text-xs text-patina-700 dark:text-teal-100 rounded-xl bg-patina-200/50 dark:bg-teal-700/40 font-medium">30D</button>
                <button className="px-4 py-2 text-xs text-patina-600 dark:text-teal-300 rounded-xl bg-patina-100/50 dark:bg-teal-900/30 hover:bg-patina-200/60 dark:hover:bg-teal-800/40 transition-colors">90D</button>
              </div>
            </div>
            <div ref={completionChartRef} className="chart-container h-64"></div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-100 mb-6">Category Breakdown</h3>
            <div ref={categoryChartRef} className="chart-container h-64"></div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-100 mb-6">Productivity Score</h3>
            <div ref={productivityGaugeRef} className="chart-container h-48"></div>
            <div className="text-center mt-4">
              <p className="text-xs text-patina-600 dark:text-teal-300 opacity-70">Based on completion rate & focus time</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-100 mb-6">Weekly Focus Hours</h3>
            <div ref={focusChartRef} className="chart-container h-48"></div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-patina-700 dark:text-teal-100 mb-6">Highlights</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50/60 to-patina-50/40 dark:from-green-900/30 dark:to-teal-900/20 rounded-2xl border border-green-200/15 dark:border-green-700/30">
                <div className="w-8 h-8 bg-green-200 dark:bg-green-700/50 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-trophy text-green-600 dark:text-green-300 text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-patina-700 dark:text-teal-100">Personal Best!</p>
                  <p className="text-xs text-patina-600 dark:text-teal-300 opacity-70">12-day productivity streak</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50/60 to-patina-50/40 dark:from-blue-900/30 dark:to-teal-900/20 rounded-2xl border border-blue-200/15 dark:border-blue-700/30">
                <div className="w-8 h-8 bg-blue-200 dark:bg-blue-700/50 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-star text-blue-600 dark:text-blue-300 text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-patina-700 dark:text-teal-100">Excellent Focus</p>
                  <p className="text-xs text-patina-600 dark:text-teal-300 opacity-70">6+ hours deep work today</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50/60 to-patina-50/40 dark:from-purple-900/30 dark:to-teal-900/20 rounded-2xl border border-purple-200/15 dark:border-purple-700/30">
                <div className="w-8 h-8 bg-purple-200 dark:bg-purple-700/50 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-bullseye text-purple-600 dark:text-purple-300 text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-patina-700 dark:text-teal-100">Goal Crusher</p>
                  <p className="text-xs text-patina-600 dark:text-teal-300 opacity-70">94% monthly achievement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => router.push('/tasks/new')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-patina-400 to-patina-500 dark:from-teal-500 dark:to-patina-600 text-white rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-xl shadow-patina-500/40 dark:shadow-teal-500/40 hover:shadow-2xl hover:shadow-patina-500/50 dark:hover:shadow-teal-500/50 z-50"
        title="Add Task"
      >
        <i className="fa-solid fa-plus text-xl"></i>
      </button>
    </AppShell>
  );
}
