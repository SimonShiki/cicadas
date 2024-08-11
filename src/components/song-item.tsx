import { Song as AbstractSong } from '../jotais/storage';
import defaultCover from '../assets/default-cover.png';
import Card from './base/card';
import { IconMenuItem, Menu, MenuItem, NativeIcon, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { songlistsJotai } from '../jotais/library';
import * as player from '../utils/player';
import Checkbox from './base/checkbox';

interface SongItemProps {
    song: AbstractSong<string>;
    selectMode?: boolean;
    select?: boolean;
    onClick (song: AbstractSong<string>): void;
    hideBg?: boolean;
    onSelect? (checked: boolean): void;
    onAddToLib? (song: AbstractSong<string>): void;
}

export default function SongItem (props: SongItemProps) {
    const [songlists, setSonglists] = useAtom(songlistsJotai);
    const showContextMenu = useCallback(async () => {
        const items = [
            await MenuItem.new({
                text: 'Play',
                action: () => {
                    player.setCurrentSong(props.song);
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
                items: await Promise.all(songlists.map((songlist, index) => (MenuItem.new({
                    text: songlist.name,
                    action: () => {
                        const newSonglist = {
                            ...songlist,
                            songs: [...songlist.songs, props.song]
                        };
                        const newSonglists = [...songlists];
                        newSonglists[index] = newSonglist;
                        setSonglists(newSonglists);
                    }
                }))))
            })
        ];
        if (props.onAddToLib) {
            items.push(
                await MenuItem.new({
                    text: 'Add to library',
                    action: () => {
                        props.onAddToLib!(props.song);
                    }
                })
            );
        }
        items.push(
            await IconMenuItem.new({
                icon: NativeIcon.Remove,
                text: 'Remove'
            }),
            await IconMenuItem.new({
                icon: NativeIcon.Info,
                text: 'Info'
            })
        );
        const menu = await Menu.new({items});
        menu.popup();
    }, [songlists, props.onAddToLib]);

    return (
        <Card onContextMenu={showContextMenu} onDoubleClick={() => {
            if (props.selectMode) return;
            props.onClick(props.song);
        }} onClickCapture={() => {
            if (!props.selectMode) return;
            props.onSelect?.(!props.select);
        }} className={`flex flex-row items-center ${props.selectMode ? '' : 'active:scale-99'} py-2 gap-2 hover:!bg-black cursor-pointer hover:!bg-op-5 transition-all ${props.hideBg ? '!border-none !bg-transparent' : ''}`}>
            {props.selectMode && (<Checkbox checked={props.select} onChange={props.onSelect} />)}
            <img draggable={false} src={props.song.cover ?? defaultCover} alt={props.song.name} className='rounded-md w-10 h-10' />
            <div className='flex flex-col gap-1'>
                <span className='color-text-pri font-size-sm font-500'>{props.song.name}</span>
                <span className='color-text-sec font-size-xs'>{props.song.album}</span>
            </div>
        </Card>
    );
}
