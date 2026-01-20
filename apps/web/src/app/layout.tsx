'use client';

import './globals.css';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import superjson from 'superjson';
import { getAuthToken } from '@/lib/supabase';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
          transformer: superjson,
          async headers() {
            const token = await getAuthToken();
            return {
              authorization: token ? `Bearer ${token}` : '',
            };
          },
        }),
      ],
    })
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>VoiceFit Coach Platform</title>
        <meta name="description" content="Professional fitness coaching platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const root = document.documentElement;
                  if (theme === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                  } else {
                    root.setAttribute('data-theme', theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background-primary text-text-primary">
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ToastProvider>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </ToastProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </body>
    </html>
  );
}
