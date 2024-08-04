import { getCurrentWindow, Window } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

let appWindow: Window;
if (typeof window === 'object') {
    appWindow = getCurrentWindow();
}

export default function TitleBar () {
    const [focus, setFocus] = useState(false);
    const [maximized, setMaximized] = useState(false);
    useEffect(() => {
        appWindow.onFocusChanged(({ payload: focused }) => {
            setFocus(focused);
        });
        appWindow.onResized(async () => {
            setMaximized(await appWindow.isMaximized());
        });
        appWindow.isMaximized().then((maximized) => {
            setMaximized(maximized);
        });
        appWindow.isFocused().then((focused) => {
            setFocus(focused);
        });
    }, []);
    return (
        <div data-tauri-drag-region className='sticky flex items-center w-full h-9 top-0 left-0 right-0 mb-4'>
            <div onClick={() => {
                history.back();
            }} className='h-9 w-12 bg-black bg-opacity-0 hover:bg-opacity-10 active:hover:bg-opacity-20 transition-colors flex justify-center items-center'>
                <span className={`i-fluent:arrow-left-16-regular ${focus ? 'opacity-100' : 'opacity-40'}`} />
            </div>
            <span data-tauri-drag-region className={`color-text-pri dark:color-text-dark-pri font-size-xs grow-1 pl-4 ${focus ? 'color-opacity-100' : 'color-opacity-40'}`}>
                Cicadas
            </span>
            <div onClick={() => {
                appWindow.minimize();
            }} className='h-9 w-12 bg-black bg-opacity-0 hover:bg-opacity-10 active:hover:bg-opacity-20 transition-colors flex justify-center items-center'>
                <span className={`i-fluent:minimize-16-regular ${focus ? 'opacity-100' : 'opacity-40'}`} />
            </div>
            <div onClick={() => {
                if (maximized) {
                    appWindow.unmaximize();
                } else {
                    appWindow.maximize();
                }
            }} className='h-9 w-12 bg-black bg-opacity-0 hover:bg-opacity-10 active:hover:bg-opacity-20 transition-colors flex justify-center items-center'>
                <span className={`${maximized ? 'i-fluent:square-multiple-16-regular' : 'i-fluent:maximize-16-regular'} ${focus ? 'opacity-100' : 'opacity-40'}`} />
            </div>
            <div onClick={() => {
                appWindow.close();
            }} className='group h-9 w-12 hover:bg-[#c42b1c] active:hover:bg-[#c53d2e] transition-colors flex justify-center items-center'>
                <span className={`i-fluent:dismiss-20-regular color-black group-hover:!color-[white] ${focus ? 'color-opacity-100' : 'color-opacity-40'}`} />
            </div>
        </div>
    );
}
