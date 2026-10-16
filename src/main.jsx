import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import './style.css';
import {QadamRoutes} from './App.jsx';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:1}}})}><BrowserRouter><QadamRoutes/></BrowserRouter></QueryClientProvider>);
