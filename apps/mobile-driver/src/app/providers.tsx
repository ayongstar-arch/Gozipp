'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  React.useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__fetch_intercepted) {
      (window as any).__fetch_intercepted = true;
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        let [resource, config] = args;
        const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
        
        // Append credentials to API calls
        if (url.includes('/api/') || url.includes('/auth/') || url.includes('/driver/') || url.includes('/passenger/') || url.includes('/upload/')) {
            config = config || {};
            config.credentials = 'include';
            if (resource instanceof Request) {
                // Recreate request because credentials property is read-only
                resource = new Request(resource, { credentials: 'include' });
            }
        }
        return originalFetch(resource, config);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
