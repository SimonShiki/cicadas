import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Song from './pages/song';
import Local from './pages/local';
import NotFound from './pages/404';
import Settings from './pages/settings';
import NCM from './pages/ncm';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <NotFound />,
        children: [
            { index: true, element: <Song /> },
            { path: 'local', element: <Local /> },
            { path: 'ncm', element: <NCM /> },
            { path: 'settings', element: <Settings />}
        ],
    },
]);

export default router;
