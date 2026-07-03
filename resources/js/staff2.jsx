import React from 'react';
import ReactDOM from 'react-dom/client';
import Staff2App from './components/Staff2App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const container = document.getElementById('staff2-root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <Staff2App />
            </QueryClientProvider>
        </React.StrictMode>
    );
}
