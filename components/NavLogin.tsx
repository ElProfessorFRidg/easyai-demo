'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Button from './ui/Button'; // Using our custom Button component

export default function NavLogin() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>; // Placeholder for loading state
  }

  if (session) {
    return (
      <div className="flex items-center space-x-2">
        {/* <span className="text-sm text-gray-600 hidden md:block">
          {session.user?.email || session.user?.name}
        </span> */}
        <Button onClick={() => signOut()} variant="ghost" size="sm">
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => signIn('github')} variant="ghost" size="sm"> {/* Default to GitHub or let user choose */}
      Sign In
    </Button>
  );
}