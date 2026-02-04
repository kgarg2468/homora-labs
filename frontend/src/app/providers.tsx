'use client';

import { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { KeyboardShortcutsProvider } from '@/hooks/useKeyboardShortcuts';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <KeyboardShortcutsProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'dark:bg-slate-800 dark:text-slate-100',
            }}
          />
        </KeyboardShortcutsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
