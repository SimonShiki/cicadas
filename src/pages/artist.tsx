import { useAtomValue } from 'jotai';
import { scannedJotai, Song } from '../jotais/storage';
import Spinner from '../components/base/spinner';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import { Artist, artistsJotai } from '../jotais/library';
import { useCallback, useState } from 'react';
import SongItem from '../components/song-item';
import * as player from '../utils/player';
import Button from '../components/base/button';
import ArtistItem from '../components/artist-item';
import { FormattedMessage } from 'react-intl';

export default function ArtistPage () {
    const scanned = useAtomValue(scannedJotai);
    const artists = useAtomValue(artistsJotai);
    const [currentArtist, setCurrentArtist] = useState<Artist | null>(null);
    const handleClickSong = useCallback((song: Song<string>) => {
        if (!currentArtist) return;
        player.clearPlaylist();
        player.addToPlaylist(...currentArtist.songs);
        player.setCurrentSong(song);
    }, [currentArtist]);

    return (
        <main className='flex flex-col h-[calc(100vh-100px)]'>
            <div className='flex flex-col gap-4 pl-2 pt-4'>
                <span className='color-text-pri font-size-3xl font-500'>
                    <FormattedMessage defaultMessage='Artists' />
                </span>
                <div className='flex flex-row items-center gap-4'>
                    {!scanned && (
                        <div className='flex items-center gap-2'>
                            <Spinner size='size-4' />
                            <span className='font-size-sm'>
                                <FormattedMessage defaultMessage='Scanning...' />
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {artists.length > 0 ? (
                <div className='flex-1 relative overflow-hidden'>
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${currentArtist ? 'translate-x-[-100%]' : 'translate-x-0'}`}>
                        <VirtuosoGrid
                            className='h-full'
                            listClassName='flex flex-wrap p-4'
                            totalCount={artists.length}
                            itemContent={(index) => {
                                const artist = artists[index];
                                return <ArtistItem artist={artist} onClick={setCurrentArtist} />;
                            }}
                        />
                    </div>
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${currentArtist ? 'translate-x-0' : 'translate-x-full'}`}>
                        {currentArtist && (
                            <div className='flex flex-col h-full'>
                                <div className='flex items-center gap-4 p-4'>
                                    <Button
                                        size='sm'
                                        className='flex items-center'
                                        onClick={() => setCurrentArtist(null)}
                                    >
                                        <span className='i-fluent:chevron-left-16-regular' />
                                        <FormattedMessage defaultMessage='Back' />
                                    </Button>
                                    <h2 className='text-xl font-semibold'>{currentArtist.name}</h2>
                                </div>
                                <Virtuoso
                                    className='flex-1'
                                    totalCount={currentArtist.songs.length}
                                    itemContent={(index) => {
                                        const song = currentArtist.songs[index];
                                        return <SongItem song={song} onClick={handleClickSong} hideBg={!(index % 2)} />;
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className='flex-1 flex justify-center items-center'>
                    <Spinner />
                </div>
            )}
        </main>
    );
}
