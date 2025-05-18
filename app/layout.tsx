import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import NavLogin from "@/components/NavLogin"; // We'll create this small component
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat App",
  description: "A Next.js chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const setInitialTheme = `
    (function() {
      function getTheme() {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme && storedTheme !== 'system') {
          return storedTheme;
        }
        // If 'system' or not set, check media query
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      const theme = getTheme();
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Optional: store the resolved theme if it was 'system' or not set, for components to read if needed
      // localStorage.setItem('resolvedSystemTheme', theme);
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning> {/* Added suppressHydrationWarning */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: setInitialTheme }} />
      </head>
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200`}>
        <AuthSessionProvider>
          <nav className="bg-white dark:bg-gray-800 shadow-md border-b dark:border-gray-700">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
              <Link href="/" className="text-xl font-semibold text-gray-800 dark:text-white">
                Chat App
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  href="/settings/apikeys"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Clés API
                </Link>
                <Link
                  href="/settings/general"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Paramètres
                </Link>
                <NavLogin /> {/* Ensure NavLogin also supports dark mode */}
              </div>
            </div>
          </nav>
          {/* The main content area will inherit body background if not overridden by page/component */}
          <main className="container mx-auto p-4 sm:p-6 lg:p-8 mt-6">{children}</main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}