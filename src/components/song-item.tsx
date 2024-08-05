import { Song as AbstractSong } from '../jotais/storage';
import defaultCover from '../assets/default-cover.png';
import Card from './base/card';
import * as player from '../utils/player';

interface SongItemProps {
    song: AbstractSong<string>;
    hideBg?: boolean;
}

export default function SongItem (props: SongItemProps) {
    return (
        <Card onDoubleClick={() => {
            player.addToPlaylist(props.song);
        }} className={`flex flex-row items-center py-2 gap-2 hover:!bg-black hover:!bg-op-5 transition-colors ${props.hideBg ? '!border-none !bg-transparent' : ''}`}>
            <img src={props.song.cover ?? defaultCover} alt={props.song.name} className='rounded-md w-10 h-10' />
            <div className='flex flex-col gap-1'>
                <span className='color-text-pri font-size-sm font-500'>{props.song.name}</span>
                <span className='color-text-sec font-size-xs'>{props.song.album}</span>
            </div>
        </Card>
    );
}
