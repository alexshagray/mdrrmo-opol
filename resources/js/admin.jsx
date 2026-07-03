import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './components/AdminApp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const container = document.getElementById('admin-root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <AdminApp />
            </QueryClientProvider>
        </React.StrictMode>
    );
}
