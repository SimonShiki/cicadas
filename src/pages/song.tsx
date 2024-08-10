import { useAtomValue } from 'jotai';
import { useState, useCallback, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import Button from '../components/base/button';
import Input from '../components/base/input';
import Select from '../components/base/select';
import Spinner from '../components/base/spinner';
import SongItem from '../components/song-item';
import { nowPlayingBarJotai } from '../jotais/play';
import * as player from '../utils/player';
import { scannedJotai } from '../jotais/storage';
import type { Song } from '../jotais/storage';
import { SortOptions, filterSongList, sortSongList } from '../utils/sort';
import { libraryJotai } from '../jotais/library';
import { FormattedMessage, useIntl } from 'react-intl';

const sortOptions = [
    { value: 'default', label: 'Default' } as const,
    { value: 'a-z', label: 'A - Z' } as const,
    { value: 'z-a', label: 'Z - A' } as const,
    { value: 'time_desc', label: 'Time (Reversed)' } as const,
    { value: 'time_asc', label: 'Time' } as const
];

export default function Song () {
    const _list = useAtomValue(libraryJotai);
    const [list, setList] = useState(_list);
    const barOpen = useAtomValue(nowPlayingBarJotai);
    const scanned = useAtomValue(scannedJotai);
    const intl = useIntl();
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState<SortOptions>('a-z');
    const handleClickSong = useCallback((song: Song<string>) => {
        player.clearPlaylist();
        player.addToPlaylist(...list);
        player.setCurrentSong(song);
    }, [list]);
    const handleRandomPlay = useCallback(() => {
        const newList = [...list];
        player.clearPlaylist();
        player.shuffleNewSongs(newList, newList.length);
        player.addToPlaylist(...newList);
        player.setCurrentSong(newList[0]);
    }, [list]);
    useEffect(() => {
        let ir: Song<string>[] = _list;
        if (keyword.trim() !== '') {
            ir = filterSongList(ir, keyword);
        }
        ir = sortSongList(ir, sortBy);
        setList(ir);
    }, [_list, keyword, sortBy]);
    return (
        <main className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4 pl-2'>
                <span className='color-text-pri font-size-3xl font-500'>
                    <FormattedMessage defaultMessage='Songs' />
                </span>
                <div className='flex flex-row items-center gap-4'>
                    <Button onClick={handleRandomPlay} variant='primary' className='flex flex-row gap-2 items-center'><span className='i-fluent:arrow-shuffle-20-regular w-5 h-5' />
                        <FormattedMessage defaultMessage='Random' />
                    </Button>
                    {!scanned && (
                        <div className='flex items-center gap-2'>
                            <Spinner size='size-4' />
                            <span className='font-size-sm'>
                                <FormattedMessage defaultMessage='Scanning...' />
                            </span>
                        </div>
                    )}
                    <Input placeholder={intl.formatMessage({ defaultMessage: 'Search'})} value={keyword} onChange={(e) => {
                        setKeyword(e.target.value);
                    }} after={<span className='i-fluent:search-20-regular' />} className='m-l-auto' />
                    <span className='color-text-pri font-size-sm'>
                        <FormattedMessage defaultMessage='Sort By:' />
                    </span>
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
