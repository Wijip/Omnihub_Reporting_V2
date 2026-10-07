import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeOption>(() => {
    try {
      const saved = localStorage.getItem('omnihub_theme_preference');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved as ThemeOption;
    } catch (e) {}
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const themeColorMeta = document.getElementById('theme-color-meta');

    const updateTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      if (isDark) {
        root.classList.add('dark');
        setResolvedTheme('dark');
        if (themeColorMeta) themeColorMeta.setAttribute('content', '#0a0a0a');
      } else {
        root.classList.remove('dark');
        setResolvedTheme('light');
        if (themeColorMeta) themeColorMeta.setAttribute('content', '#ffffff');
      }
    };

    updateTheme();

    // Event listener jika OS mengubah mode secara otomatis
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: ThemeOption) => {
    setThemeState(newTheme);
    localStorage.setItem('omnihub_theme_preference', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
