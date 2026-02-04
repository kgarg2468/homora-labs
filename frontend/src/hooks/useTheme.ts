'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? resolvedTheme : 'light';
  const isDark = currentTheme === 'dark';

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const setSystemTheme = () => {
    setTheme('system');
  };

  return {
    theme: mounted ? theme : 'system',
    resolvedTheme: currentTheme,
    isDark,
    setTheme,
    toggleTheme,
    setSystemTheme,
    mounted,
  };
}
