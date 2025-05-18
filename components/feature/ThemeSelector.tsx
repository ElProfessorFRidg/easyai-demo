'use client';

import React, { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeSelector: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');

  const applyTheme = useCallback((theme: Theme) => {
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = storedTheme || 'system';
    setSelectedTheme(initialTheme);
    applyTheme(initialTheme);
  }, [applyTheme]);

  useEffect(() => {
    if (selectedTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [selectedTheme, applyTheme]);

  const handleThemeChange = (theme: Theme) => {
    setSelectedTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Select Theme</h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
        {([
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System Default' },
        ] as { value: Theme; label: string }[]).map((option) => (
          <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={selectedTheme === option.value}
              onChange={() => handleThemeChange(option.value)}
              className="form-radio h-4 w-4 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-gray-700"
            />
            <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Current selection: <strong>{selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}</strong>.
        {selectedTheme === 'system' && ' (Follows your operating system preference)'}
      </p>
    </div>
  );
};

export default ThemeSelector;