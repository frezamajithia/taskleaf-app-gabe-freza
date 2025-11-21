/**
 * Theme store using Zustand for dark mode management
 */
import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  isHydrated: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  initializeTheme: () => void;
}

const applyTheme = (isDark: boolean) => {
  if (typeof window === 'undefined') return;

  // Apply to both html (for Tailwind) and body (for existing CSS)
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-mode');
  }
};

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  isHydrated: false,

  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      applyTheme(newMode);
    }
    return { isDarkMode: newMode };
  }),

  setDarkMode: (isDark: boolean) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(isDark));
      applyTheme(isDark);
    }
    return { isDarkMode: isDark };
  }),

  initializeTheme: () => set(() => {
    if (typeof window === 'undefined') return { isHydrated: false };

    const savedMode = localStorage.getItem('darkMode');
    const isDark = savedMode !== null ? JSON.parse(savedMode) : false;
    applyTheme(isDark);

    return { isDarkMode: isDark, isHydrated: true };
  }),
}));
