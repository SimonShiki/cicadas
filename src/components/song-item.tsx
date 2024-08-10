import { Song as AbstractSong } from '../jotais/storage';
import defaultCover from '../assets/default-cover.png';
import Card from './base/card';
import { IconMenuItem, Menu, MenuItem, NativeIcon, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { useCallback } from 'react';

interface SongItemProps {
    song: AbstractSong<string>;
    onClick (song: AbstractSong<string>): void;
    hideBg?: boolean;
}

export default function SongItem (props: SongItemProps) {
    const showContextMenu = useCallback(async () => {
        const menu = await Menu.new({
            items: [
                await MenuItem.new({
                    text: 'Play',
                    action: () => {
                        props.onClick(props.song);
                    }
                }),
                await MenuItem.new({
                    text: 'Add to playlist',
                    action: () => {
                        props.onClick(props.song);
                    }
                }),
                await PredefinedMenuItem.new({
                    item: 'Separator'
                }),
                await Submenu.new({
                    text: 'Add to',
                    items: []
                }),
                await IconMenuItem.new({
                    icon: NativeIcon.Remove,
                    text: 'Remove'
                }),
                await IconMenuItem.new({
                    icon: NativeIcon.Info,
                    text: 'Info'
                })
            ]
        });
        menu.popup();
    }, []);

    return (
        <Card onContextMenu={showContextMenu} onDoubleClick={() => {
            props.onClick(props.song);
        }} className={`flex flex-row items-center active:scale-99 py-2 gap-2 hover:!bg-black cursor-pointer hover:!bg-op-5 transition-all ${props.hideBg ? '!border-none !bg-transparent' : ''}`}>
            <img draggable={false} src={props.song.cover ?? defaultCover} alt={props.song.name} className='rounded-md w-10 h-10' />
            <div className='flex flex-col gap-1'>
                <span className='color-text-pri font-size-sm font-500'>{props.song.name}</span>
                <span className='color-text-sec font-size-xs'>{props.song.album}</span>
            </div>
        </Card>
    );
}
