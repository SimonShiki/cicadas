import 'virtual:uno.css';
import './global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { Provider } from 'jotai';
import TitleBar from './components/title-bar';
import sharedStore from './jotais/shared-store';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Provider store={sharedStore}>
            <TitleBar />
            <RouterProvider router={router} />
        </Provider>
    </React.StrictMode>,
);
