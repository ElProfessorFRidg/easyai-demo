import ThemeSelector from '@/components/feature/ThemeSelector';
import LogSettings from '@/components/feature/LogSettings'; // We will create this
import React from 'react';

const GeneralSettingsPage = () => {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">Paramètres Généraux</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Apparence</h2>
        <ThemeSelector />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Paramètres des Logs</h2>
        <LogSettings />
      </div>
    </div>
  );
};

export default GeneralSettingsPage;