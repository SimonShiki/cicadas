import Tooltip from './base/tooltip';
import { Virtuoso } from 'react-virtuoso';
import { FormattedMessage } from 'react-intl';
import defaultCover from '../assets/default-cover.png';
import * as player from '../utils/player';
import { useAtomValue } from 'jotai';
import { currentSongJotai, playlistJotai } from '../jotais/play';

export default function PlaylistTooltip () {
    const playlist = useAtomValue(playlistJotai);
    const currentSong = useAtomValue(currentSongJotai);
    return (
        <Tooltip
            content={(
                <div className='flex flex-col h-64 w-72 gap-4 p-2'>
                    <span className='font-(500 size-lg)'>
                        <FormattedMessage defaultMessage='Playlist ({total})' values={{ total: playlist.length }} />
                    </span>
                    <Virtuoso
                        totalCount={playlist.length}
                        itemContent={(index) => {
                            const thatSong = playlist[index];
                            return (
                                <div onDoubleClickCapture={() => {
                                    player.setCurrentSong(thatSong);
                                }} className='flex gap-2 py-2 border-b-(1 solid outline-pri) hover:bg-bg-pri cursor-pointer transition-colors items-center'>
                                    <img draggable={false} src={thatSong.cover ?? defaultCover} alt={thatSong.name} className='rounded-md w-8 h-8' />
                                    <div className='flex flex-col *:text-truncate max-w-56'>
                                        <span className={`color-text-pri font-size-xs font-500 ${currentSong!.id === thatSong.id ? 'color-fg-pri font-600' : ''}`}>{thatSong.name}</span>
                                        <span className={`color-text-sec font-size-xs ${currentSong!.id === thatSong.id ? '!color-fg-pri' : ''}`}>{thatSong.album}</span>
                                    </div>
                                </div>
                            );
                        }}
                    />
                </div>
            )}
            className='flex w-5 h-5'
            placement='top-right'
            trigger='click'
        >
            <span className='i-fluent:navigation-play-20-regular w-5 h-5 cursor-pointer' />
        </Tooltip>
    );
}
