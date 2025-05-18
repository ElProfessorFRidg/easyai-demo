import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ManageApiKeys from '@/components/feature/ManageApiKeys'; // We will create this component next

export default async function ApiKeysSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/api/auth/signin?callbackUrl=/settings/apikeys'); // Or your login page
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Gérer mes Clés API
      </h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        Ajoutez, modifiez ou supprimez vos clés API pour les différents fournisseurs d'IA.
        Ces clés sont stockées de manière sécurisée et chiffrée.
      </p>
      <ManageApiKeys />
    </div>
  );
}