import { FormattedMessage } from 'react-intl';
import defaultCover from '../assets/default-cover.png';
import Card from './base/card';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { useCallback } from 'react';

interface SonglistItemProps {
    id: string | number;
    index?: number;
    total?: number;
    name: string;
    cover?: string;
    onClick (id: string | number, index?: number): void;
    onPlayAll (id: string | number, index?: number): void;
    onDelete? (id: string | number, index?: number): void;
    hideBg?: boolean;
}

export default function SonglistItem (props: SonglistItemProps) {
    const showContextMenu = useCallback(async () => {
        const items = [
            await MenuItem.new({
                text: 'Play',
                action: () => {
                    props.onPlayAll(props.id, props.index);
                }
            })
        ];
        if (props.onDelete) {
            items.push(
                await MenuItem.new({
                    text: 'Delete',
                    action: () => {
                        props.onDelete!(props.id, props.index);
                    }
                })
            );
        }
        const menu = await Menu.new({items});
        menu.popup();
    }, [props.id, props.onPlayAll, props.onDelete, props.index]);
    return (
        <Card onContextMenu={showContextMenu} onClick={() => {
            props.onClick(props.id, props.index);
        }} className={`!hover:border-outline-pri flex flex-row items-center active:scale-99 py-2 gap-2 hover:!bg-black cursor-pointer hover:!bg-op-5 transition-all ${props.hideBg ? '!border-none !bg-transparent' : ''}`}>
            <img draggable={false} src={props.cover ?? defaultCover} alt={props.name} className='rounded-md w-10 h-10' />
            <div className='flex flex-col *:text-ellipsis text-nowrap *:overflow-hidden'>
                <span className='color-text-pri font-size-sm font-500'>{props.name}</span>
                {props.total !== undefined ? (
                    <span className='font-size-sm color-text-sec'>
                        <FormattedMessage defaultMessage='{total} Songs' values={{ total: props.total }} />
                    </span>
                ) : null}
            </div>
        </Card>
    );
}
