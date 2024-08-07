import { storagesJotai } from '../jotais/storage';
import { useAtomValue } from 'jotai';
import SongItem from '../components/song-item';
import Button from '../components/base/button';
import Select from '../components/base/select';
import Input from '../components/base/input';
import { Virtuoso } from 'react-virtuoso';
import type { Song as AbstractSong } from '../jotais/storage';
import { focusAtom } from 'jotai-optics';
import Spinner from '../components/base/spinner';
import * as player from '../utils/player';
import { useCallback, useEffect, useState } from 'react';
import { SortOptions, sortSongList } from '../utils/sort';
import { nowPlayingBarJotai } from '../jotais/play';

const localStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('local'));
const songlistJotai = focusAtom(localStorageJotai, (optic) => optic.prop('songList'));
const scannedJotai = focusAtom(localStorageJotai, (optic) => optic.prop('scanned'));

const sortOptions = [
    {value: 'default', label: 'Default'} as const,
    {value: 'a-z', label: 'A - Z'} as const,
    { value: 'z-a', label: 'Z - A' } as const,
    { value: 'time_desc', label: 'Time (Reversed)' } as const,
    { value: 'time_asc', label: 'Time' } as const
];

export default function Local () {
    const _list = useAtomValue(songlistJotai);
    const [list, setList] = useState(_list);
    const barOpen = useAtomValue(nowPlayingBarJotai);
    const scanned = useAtomValue(scannedJotai);
    const [sortBy, setSortBy] = useState<SortOptions>('a-z');
    const handleClickSong = useCallback((song: AbstractSong<'local'>) => {
        player.clearPlaylist();
        player.addToPlaylist(...list);
        player.setCurrentSong(song);
    }, [list]);
    useEffect(() => {
        setList(sortSongList(_list, sortBy));
    }, [_list, sortBy]);
    return (
        <main className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4 pl-2'>
                <span className='color-text-pri font-size-3xl font-500'>Local</span>
                <div className='flex flex-row items-center gap-4'>
                    <Button variant='primary' className='flex flex-row gap-2 items-center'><span className='i-fluent:arrow-shuffle-20-regular w-5 h-5' />Random</Button>
                    {!scanned && (
                        <div className='flex items-center gap-2'>
                            <Spinner size='size-4' />
                            <span className='font-size-sm'>Scanning...</span>
                        </div>
                    )}
                    <Input placeholder='Search' after={<span className='i-fluent:search-20-regular' />} className='m-l-auto' />
                    <span className='color-text-pri font-size-sm'>Sort By:</span>
                    <Select position='left' options={sortOptions} onChange={option => {
                        setSortBy(option);
                    }} value={sortBy} />
                </div>
            </div>
            {list.length > 0 ? (
                <div className='h-[calc(100vh-204px)]'>
                    <Virtuoso
                        computeItemKey={(i) => `${sortBy}-${i}`}
                        totalCount={barOpen ? list.length + 1 : list.length}
                        itemContent={(index) => {
                            if (index === list.length) {
                                return <div className='h-20' />;
                            }
                            const song = list[index];
                            return <SongItem song={song} onClick={handleClickSong} hideBg={!(index % 2)} />;
                        }}
                    />
                </div>
            ) : (
                <div className='flex justify-center items-center pt-20vh'>
                    <Spinner />
                </div>
            )}
        </main>
    );
}
