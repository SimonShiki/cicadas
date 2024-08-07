import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from './components/navigation';
import NowPlaying from './components/now-playing';

function App () {
    const location = useLocation();
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        setAnimating(true);
    }, [location]);

    useEffect(() => {
        const disableContextMenu = (event: MouseEvent) => event.preventDefault();
        document.addEventListener('contextmenu', disableContextMenu);
        return () => document.removeEventListener('contextmenu', disableContextMenu);
    }, []);
    return (
        <div className='flex flex-row'>
            <Navigation />
            <div className={`flex flex-col bg-white bg-opacity-60 rounded-1.5 border-(1 solid outline-pri) w-full h-[calc(100vh-84px)] overflow-auto p-4 ${animating ? 'overflow-hidden' : ''}`}>
                <div className={animating ? 'fadePageIn' : ''} onAnimationEnd={() => {
                    setAnimating(false);
                }}>
                    <Outlet />
                </div>
            </div>
            <NowPlaying />
        </div>
    );
}

export default App;
