import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Song from './pages/song';
import Local from './pages/local';
import NotFound from './pages/404';
import Settings from './pages/settings';
import NCM from './pages/ncm';
import Album from './pages/album';
import Songlist from './pages/songlist';
import Artist from './pages/artist';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <NotFound />,
        children: [
            { index: true, element: <Song /> },
            { path: 'album', element: <Album /> },
            { path: 'artist', element: <Artist /> },
            { path: 'local', element: <Local /> },
            { path: 'ncm', element: <NCM /> },
            { path: 'settings', element: <Settings />},
            { path: 'songlist', element: <Songlist /> },
        ],
    },
]);

export default router;
