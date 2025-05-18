'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { AIProvider, aiProviders, AIProviderConfig } from '@/lib/ai-providers';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface UserApiKey {
  providerName: AIProvider;
  // We don't store/show the actual key, only if it's set
  isSet: boolean;
  updatedAt?: string; // Optional: show when it was last updated
}

const ManageApiKeys: React.FC = () => {
  const [userKeys, setUserKeys] = useState<UserApiKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(aiProviders[0].id);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const fetchUserApiKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/apikeys');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }
      const data: { configuredProviders: AIProvider[] } = await response.json();
      
      // Map all available providers and mark if they are configured
      const allProviderStates = aiProviders.map(p => ({
        providerName: p.id,
        isSet: data.configuredProviders.includes(p.id),
      }));
      setUserKeys(allProviderStates);

    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching user API keys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserApiKeys();
  }, []);

  const handleSubmitApiKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setSubmitMessage('API Key cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/user/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerName: selectedProvider,
          apiKey: apiKeyInput,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to save API key (status: ${response.status})`);
      }
      
      setSubmitMessage(`API Key for ${aiProviders.find(p=>p.id === selectedProvider)?.name} saved successfully!`);
      setApiKeyInput(''); // Clear input
      await fetchUserApiKeys(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
      console.error("Error submitting API key:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApiKey = async (providerId: AIProvider) => {
    if (!confirm(`Are you sure you want to delete the API key for ${aiProviders.find(p=>p.id === providerId)?.name}?`)) {
      return;
    }
    setIsSubmitting(true); // Use general submitting state or a specific one
    setSubmitMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/user/apikeys/${providerId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to delete API key (status: ${response.status})`);
      }
      setSubmitMessage(`API Key for ${aiProviders.find(p=>p.id === providerId)?.name} deleted successfully!`);
      await fetchUserApiKeys(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
      console.error("Error deleting API key:", err);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return <p className="text-gray-600 dark:text-gray-300">Loading your API key configurations...</p>;
  }

  return (
    // The parent page app/(pages)/settings/apikeys/page.tsx has "container mx-auto py-8 px-4"
    // and the RootLayout has bg-gray-100 dark:bg-gray-900 (assuming dark mode for body is set in globals or layout)
    // This component will sit on that background.
    <div className="max-w-3xl mx-auto space-y-10"> {/* Increased max-width slightly */}
      {error && <div role="alert" className="text-red-700 bg-red-100 dark:text-red-100 dark:bg-red-700/30 p-4 rounded-lg border border-red-300 dark:border-red-600">{error}</div>}
      {submitMessage && <div role="alert" className="text-green-700 bg-green-100 dark:text-green-100 dark:bg-green-700/30 p-4 rounded-lg border border-green-300 dark:border-green-600">{submitMessage}</div>}

      <section aria-labelledby="add-update-key-heading" className="p-6 sm:p-8 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 id="add-update-key-heading" className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Ajouter ou Mettre à Jour une Clé API</h2>
        <form onSubmit={handleSubmitApiKey} className="space-y-6">
          <div>
            <label htmlFor="ai-provider-select-manage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Fournisseur d'IA :
            </label>
            <select
              id="ai-provider-select-manage"
              name="aiProvider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
              className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 shadow-sm"
            >
              {aiProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Clé API :
            </label>
            <Input
              id="api-key-input"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Entrez votre clé API ici"
              className="w-full py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" // Explicit text/bg for input
              required
            />
          </div>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting} className="w-full sm:w-auto">
            {userKeys.find(k => k.providerName === selectedProvider)?.isSet ? 'Mettre à Jour la Clé' : 'Sauvegarder la Clé'}
          </Button>
        </form>
      </section>

      <section aria-labelledby="configured-keys-heading">
        <h2 id="configured-keys-heading" className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Clés API Configurées</h2>
        {isLoading && !userKeys.length ? (
             <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">Chargement des configurations...</p>
             </div>
        ) : userKeys.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {userKeys.map(keyInfo => {
                const providerConfig = aiProviders.find(p => p.id === keyInfo.providerName);
                return (
                  <li key={keyInfo.providerName} className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                    <div className="flex-grow">
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{providerConfig?.name}</p>
                      <p className={`text-sm ${keyInfo.isSet ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {keyInfo.isSet ? 'Clé configurée' : 'Clé non configurée'}
                      </p>
                    </div>
                    {keyInfo.isSet && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteApiKey(keyInfo.providerName)}
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                      >
                        Supprimer la Clé
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune clé API configurée</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Commencez par ajouter une clé API en utilisant le formulaire ci-dessus.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManageApiKeys;