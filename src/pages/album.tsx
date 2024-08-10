import { useAtomValue } from 'jotai';
import { scannedJotai, Song } from '../jotais/storage';
import Spinner from '../components/base/spinner';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import { albumsJotai, Album } from '../jotais/library';
import AlbumItem from '../components/album-item';
import { useCallback, useState } from 'react';
import SongItem from '../components/song-item';
import * as player from '../utils/player';
import Button from '../components/base/button';

export default function AlbumPage() {
    const scanned = useAtomValue(scannedJotai);
    const albums = useAtomValue(albumsJotai);
    const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
    const handleClickSong = useCallback((song: Song<string>) => {
        if (!currentAlbum) return;
        player.clearPlaylist();
        player.addToPlaylist(...currentAlbum.songs);
        player.setCurrentSong(song);
    }, [currentAlbum]);

    return (
        <main className='flex flex-col h-[calc(100vh-100px)]'>
            <div className='flex flex-col gap-4 pl-2 pt-4'>
                <span className='color-text-pri font-size-3xl font-500'>Albums</span>
                <div className='flex flex-row items-center gap-4'>
                    {!scanned && (
                        <div className='flex items-center gap-2'>
                            <Spinner size='size-4' />
                            <span className='font-size-sm'>Scanning...</span>
                        </div>
                    )}
                </div>
            </div>
            {albums.length > 0 ? (
                <div className='flex-1 relative overflow-hidden'>
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${currentAlbum ? 'translate-x-[-100%]' : 'translate-x-0'}`}>
                        <VirtuosoGrid
                            className='h-full'
                            listClassName='flex flex-wrap p-4'
                            totalCount={albums.length}
                            itemContent={(index) => {
                                const album = albums[index];
                                return <AlbumItem album={album} onClick={setCurrentAlbum} />;
                            }}
                        />
                    </div>
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${currentAlbum ? 'translate-x-0' : 'translate-x-full'}`}>
                        {currentAlbum && (
                            <div className='flex flex-col h-full'>
                                <div className='flex items-center gap-4 p-4'>
                                    <Button
                                        size='sm'
                                        className='flex items-center'
                                        onClick={() => setCurrentAlbum(null)}
                                    >
                                        <span className='i-fluent:chevron-left-16-regular' />
                                        Back
                                    </Button>
                                    <h2 className='text-xl font-semibold'>{currentAlbum.name}</h2>
                                </div>
                                <Virtuoso
                                    className='flex-1'
                                    totalCount={currentAlbum.songs.length}
                                    itemContent={(index) => {
                                        const song = currentAlbum.songs[index];
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
