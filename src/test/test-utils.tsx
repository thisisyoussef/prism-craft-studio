import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

export function renderWithAppProviders(ui: React.ReactElement, options?: { route?: string, path?: string, prime?: (qc: QueryClient) => void }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });

  // Allow tests to seed cache synchronously before initial render
  if (options?.prime) {
    try { options.prime(queryClient) } catch {}
  }

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[options?.route || '/']}>
          {options?.path ? (
            <Routes>
              <Route path={options.path} element={children as any} />
            </Routes>
          ) : (
            children
          )}
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper }),
  };
}

export function renderWithBrowser(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}

