'use client';

import React, { useState, useEffect, useCallback } from 'react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface LogSettingsConfig {
  displayLogs: boolean;
  logLevel: LogLevel;
}

const LogSettings: React.FC = () => {
  const [displayLogs, setDisplayLogs] = useState<boolean>(true);
  const [logLevel, setLogLevel] = useState<LogLevel>('info');

  const saveSettings = useCallback((settings: LogSettingsConfig) => {
    localStorage.setItem('logSettings', JSON.stringify(settings));
    // Here you would typically also dispatch an event or update a global state
    // to make other parts of the application aware of the new log settings.
    // For now, we'll just log it.
    console.log('Log settings updated:', settings);
  }, []);

  useEffect(() => {
    const storedSettings = localStorage.getItem('logSettings');
    if (storedSettings) {
      try {
        const parsedSettings: LogSettingsConfig = JSON.parse(storedSettings);
        setDisplayLogs(parsedSettings.displayLogs);
        setLogLevel(parsedSettings.logLevel);
      } catch (error) {
        console.error('Failed to parse log settings from localStorage', error);
        // Set default values if parsing fails
        setDisplayLogs(true);
        setLogLevel('info');
        saveSettings({ displayLogs: true, logLevel: 'info' });
      }
    } else {
      // Default settings if nothing is stored
      saveSettings({ displayLogs: true, logLevel: 'info' });
    }
  }, [saveSettings]);

  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayLogs = e.target.checked;
    setDisplayLogs(newDisplayLogs);
    saveSettings({ displayLogs: newDisplayLogs, logLevel });
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLogLevel = e.target.value as LogLevel;
    setLogLevel(newLogLevel);
    saveSettings({ displayLogs, logLevel: newLogLevel });
  };

  const logLevels: { value: LogLevel; label: string }[] = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'none', label: 'None (Disable Logs)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label htmlFor="displayLogs" className="text-gray-700 dark:text-gray-300">
          Afficher les logs dans la console:
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="displayLogs"
            checked={displayLogs}
            onChange={handleDisplayChange}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div>
        <label htmlFor="logLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Niveau des logs:
        </label>
        <select
          id="logLevel"
          name="logLevel"
          value={logLevel}
          onChange={handleLevelChange}
          disabled={!displayLogs}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50"
        >
          {logLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        {!displayLogs && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            L'affichage des logs est désactivé. Le niveau des logs n'aura pas d'effet.
          </p>
        )}
      </div>
    </div>
  );
};

export default LogSettings;