import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './index';
import ErrorBoundary from './components/ErrorBoundary';
import { AppStateProvider } from './context/AppStateContext';
import { SnackBarProvider } from './context/SnackBarContext';
import './index.css';
import './style.css';
import 'tailwindcss/tailwind.css';

// Error handler for uncaught promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Prevent the default handler to avoid double-logging
    event.preventDefault();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Prevent the default handler to avoid double-logging
    event.preventDefault();
});

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Wrap the app with strict mode and providers
root.render(
    <AppStateProvider>
        <SnackBarProvider>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </SnackBarProvider>
    </AppStateProvider>
);
