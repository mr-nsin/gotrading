"use client";

import {
 QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
 useState, type ReactNode } from "react";
import {
 Toaster } from "sonner";
import {
 SettingsProvider } from "@/components/settings-provider";
import {
 CommandPalette } from "@/components/command-palette";
import {
 TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider delayDuration={0}>
          {children}
          <CommandPalette />
        </TooltipProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--popover)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
