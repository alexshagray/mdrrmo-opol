
import React from 'react';
import { createRoot } from 'react-dom/client';
import Staff1App from './components/Staff1App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const container = document.getElementById('staff1-root');

if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <Staff1App />
            </QueryClientProvider>
        </React.StrictMode>
    );
}
