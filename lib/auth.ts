import NextAuth, { type NextAuthOptions, type DefaultSession } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './db'; // Revert to using the shared prisma instance
// import { PrismaClient, User, Account, Session, VerificationToken } from '@prisma/client'; // Remove explicit model imports

// Instantiate a new Prisma Client specifically for the adapter for this test
// const adapterPrisma = new PrismaClient(); // Remove this test instance

// Log to see if models are accessible on the instance
// console.log('Adapter Prisma User:', typeof adapterPrisma.user);
// console.log('Adapter Prisma Account:', typeof adapterPrisma.account);


// Type augmentation for NextAuth session and user
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Revert to using the shared prisma instance
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    // Add other providers here
  ],
  session: {
    strategy: 'jwt', // Using JWT for session strategy
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // signIn: '/auth/signin', // Optional: Custom sign-in page
  },
};

export default NextAuth(authOptions);