'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface AuthSessionProviderProps {
  children: React.ReactNode;
}

const AuthSessionProvider: React.FC<AuthSessionProviderProps> = ({ children }) => {
  return <SessionProvider>{children}</SessionProvider>;
};

export default AuthSessionProvider;