"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ConfirmProvider } from "@/components/ui/confirm-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchInterval: 30 * 1000,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
