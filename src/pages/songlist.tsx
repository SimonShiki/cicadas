import { useAtom, useAtomValue } from 'jotai';
import { scannedJotai, Song } from '../jotais/storage';
import Spinner from '../components/base/spinner';
import { Virtuoso } from 'react-virtuoso';
import { Songlist, songlistsJotai } from '../jotais/library';
import { useCallback, useEffect, useState } from 'react';
import SongItem from '../components/song-item';
import * as player from '../utils/player';
import { FormattedMessage, useIntl } from 'react-intl';
import SonglistItem from '../components/songlist-item';
import Button from '../components/base/button';
import Tooltip from '../components/base/tooltip';
import Input from '../components/base/input';
import { SortOptions, sortSongList } from '../utils/sort';
import Select from '../components/base/select';

export default function SonglistPage () {
    const scanned = useAtomValue(scannedJotai);
    const intl = useIntl();
    const [songlists, setSonglists] = useAtom(songlistsJotai);
    const [songlistName, setSonglistName] = useState('');
    const [_currentSonglist, _setCurrentSonglist] = useState<Songlist | null>(null);
    const [currentSonglist, setCurrentSonglist] = useState<Songlist | null>(null);
    const [sortBy, setSortBy] = useState<SortOptions>('a-z');

    const sortOptions = [
        { value: 'default', label: intl.formatMessage({ defaultMessage: 'Default' }) } as const,
        { value: 'a-z', label: intl.formatMessage({ defaultMessage: 'A - Z' }) } as const,
        { value: 'z-a', label: intl.formatMessage({ defaultMessage: 'Z - A' }) } as const,
        { value: 'time_desc', label: intl.formatMessage({ defaultMessage: 'Time (Reversed)' }) } as const,
        { value: 'time_asc', label: intl.formatMessage({ defaultMessage: 'Time' }) } as const
    ];

    useEffect(() => {
        if (_currentSonglist === null) {
            setCurrentSonglist(null);
            return;
        }
        let ir: Song<string>[] = _currentSonglist.songs;
        ir = sortSongList(ir, sortBy);
        setCurrentSonglist({
            ..._currentSonglist,
            ...{songs: ir}
        });
    }, [_currentSonglist, sortBy]);
    const handleRandomPlay = useCallback(() => {
        if (!currentSonglist) return;
        const newList = [...currentSonglist.songs];
        player.clearPlaylist();
        player.shuffleNewSongs(newList, newList.length);
        player.addToPlaylist(...newList);
        player.setCurrentSong(newList[0]);
    }, [currentSonglist]);
    const handleClickSong = useCallback((song: Song<string>) => {
        if (!currentSonglist) return;
        player.clearPlaylist();
        player.addToPlaylist(...currentSonglist.songs);
        player.setCurrentSong(song);
    }, [currentSonglist]);
    const handleClickSonglist = useCallback((index: number) => {
        const songlist = songlists[index];
        if (!songlist.songs.length) return;
        player.clearPlaylist();
        player.addToPlaylist(...songlist.songs);
        player.setCurrentSong(songlist.songs[0]);
    }, [songlists]);
    const handleCreateSonglist = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSonglists([...songlists, {
            name: songlistName,
            songs: []
        }]);
        setSonglistName('');
    }, [songlists, songlistName]);
    const handleDeleteSonglist = useCallback((index: number) => {
        const newSonglists = [...songlists];
        newSonglists.splice(index, 1);
        setSonglists(newSonglists);
    }, [songlists]);

    return (
        <main className='flex flex-col h-[calc(100vh-100px)]'>
            <div className='flex flex-col gap-4 pl-2 pt-4 pb-4'>
                <span className='color-text-pri font-size-3xl font-500'>
                    <FormattedMessage defaultMessage='Songlists' />
                </span>
                <div className='flex flex-row items-center gap-4'>
                    <Tooltip trigger='click' tooltipClassName='!bg-transparent p-4 backdrop-blur-xl translate-z-0' placement='right' content={(
                        <form className='flex flex-col items-end gap-2' onSubmit={handleCreateSonglist} autoComplete='off'>
                            <Input value={songlistName} onChange={(e) => {
                                setSonglistName(e.target.value);
                            }} placeholder={intl.formatMessage({ defaultMessage: 'Name'})} />
                            <Button variant='primary'>
                                <FormattedMessage defaultMessage='Add' />
                            </Button>
                        </form>
                    )}>
                        <Button variant='primary' className='flex items-center'>
                            <span className='i-fluent:add-24-regular size-4' />
                            <FormattedMessage defaultMessage='Add' />
                        </Button>
                    </Tooltip>
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
            {songlists.length > 0 ? (
                <div className='flex-1 relative overflow-hidden'>
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${currentSonglist ? 'translate-x-[-100%]' : 'translate-x-0'}`}>
                        <Virtuoso
                            className='h-full'
                            totalCount={songlists.length}
                            itemContent={(index) => {
                                const songlist = songlists[index];
                                return (
                                    <SonglistItem
                                        name={songlist.name}
                                        total={songlist.songs.length}
                                        id={index}
                                        cover={songlist.songs[0]?.cover}
                                        hideBg={!(index % 2)}
                                        onDelete={handleDeleteSonglist}
                                        onPlayAll={handleClickSonglist}
                                        onClick={(i: number) => {
                                            _setCurrentSonglist(songlists[i]);
                                        }}
                                    />
                                );
                            }}
                        />
                    </div>
                    <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${currentSonglist ? 'translate-x-0' : 'translate-x-full'}`}>
                        {currentSonglist && (
                            <div className='flex flex-col h-full'>
                                <div className='flex items-center gap-4 px-4 py-2'>
                                    <Button
                                        size='sm'
                                        className='flex items-center'
                                        onClick={() => _setCurrentSonglist(null)}
                                    >
                                        <span className='i-fluent:chevron-left-16-regular' />
                                        <FormattedMessage defaultMessage='Back' />
                                    </Button>
                                    <span className='text-xl font-semibold'>{currentSonglist.name}</span>
                                    <Button onClick={handleRandomPlay} variant='primary' className='mr-auto flex flex-row gap-2 items-center'><span className='i-fluent:arrow-shuffle-20-regular w-5 h-5' />
                                        <FormattedMessage defaultMessage='Random' />
                                    </Button>
                                    <span className='color-text-pri font-size-sm'>
                                        <FormattedMessage defaultMessage='Sort By:' />
                                    </span>
                                    <Select position='left' options={sortOptions} onChange={option => {
                                        setSortBy(option);
                                    }} value={sortBy} />
                                </div>
                                <Virtuoso
                                    className='flex-1'
                                    totalCount={currentSonglist.songs.length}
                                    itemContent={(index) => {
                                        const song = currentSonglist.songs[index];
                                        return <SongItem song={song} onClick={handleClickSong} hideBg={!(index % 2)} />;
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                scanned ? (
                    <div className='flex-1 flex justify-center items-center'>
                        <span className='color-text-sec'>Empty</span>
                    </div>
                ) : (
                    <div className='flex-1 flex justify-center items-center'>
                        <Spinner />
                    </div>
                )
            )}
        </main>
    );
}
