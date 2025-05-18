'use client';

import React, { useState, useEffect } from 'react';
import { AIProvider, aiProviders, AIProviderConfig, getDefaultProvider } from '@/lib/ai-providers';

interface AIProviderSelectorProps {
  initialProviderId?: AIProvider;
  onProviderChange: (provider: AIProviderConfig) => void;
  className?: string;
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  initialProviderId,
  onProviderChange,
  className = '',
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderConfig>(() => {
    const initialProvider = initialProviderId
      ? aiProviders.find(p => p.id === initialProviderId)
      : getDefaultProvider();
    return initialProvider || getDefaultProvider();
  });

  useEffect(() => {
    if (initialProviderId) {
      const provider = aiProviders.find(p => p.id === initialProviderId);
      if (provider) {
        setSelectedProvider(provider);
      }
    }
  }, [initialProviderId]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = event.target.value as AIProvider;
    const provider = aiProviders.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      onProviderChange(provider);
    }
  };

  return (
    <div className={`ai-provider-selector ${className}`}>
      <label htmlFor="ai-provider-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Modèle IA :
      </label>
      <select
        id="ai-provider-select"
        value={selectedProvider.id}
        onChange={handleChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        {aiProviders.map(provider => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AIProviderSelector;