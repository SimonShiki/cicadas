import { useAtom, useAtomValue } from 'jotai';
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
import { libraryJotai, songlistsJotai } from '../jotais/library';
import { FormattedMessage, useIntl } from 'react-intl';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';

export default function SongPage () {
    const _list = useAtomValue(libraryJotai);
    const [list, setList] = useState(_list);
    const barOpen = useAtomValue(nowPlayingBarJotai);
    const scanned = useAtomValue(scannedJotai);
    const [songlists, setSonglists] = useAtom(songlistsJotai);
    const intl = useIntl();
    const [multiselect, setMultiselect] = useState(false);
    const [selected, setSelected] = useState<(number | string)[]>([]);
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState<SortOptions>('a-z');
    const sortOptions = [
        { value: 'default', label: intl.formatMessage({ defaultMessage: 'Default' }) } as const,
        { value: 'a-z', label: intl.formatMessage({ defaultMessage: 'A - Z' }) } as const,
        { value: 'z-a', label: intl.formatMessage({ defaultMessage: 'Z - A' }) } as const,
        { value: 'time_desc', label: intl.formatMessage({ defaultMessage: 'Time (Reversed)' }) } as const,
        { value: 'time_asc', label: intl.formatMessage({ defaultMessage: 'Time' }) } as const
    ];
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
    const handleSelect = useCallback((id: string | number, checked: boolean) => {
        const newSelected = [...selected];
        if (checked && !selected.includes(id)) newSelected.push(id);
        else if (selected.includes(id)) {
            newSelected.splice(selected.indexOf(id), 1);
        }
        setSelected(newSelected);
    }, [selected]);
    const handleMultiselectOperate = useCallback(async () => {
        const menu = await Menu.new({
            items: [
                await MenuItem.new({
                    text: 'Add to playlist',
                    action: () => {
                        const songs = selected.map(id => _list.find(song => song.id === id)!);
                        player.clearPlaylist();
                        player.addToPlaylist(...songs);
                        player.setCurrentSong(songs[0]);
                        setMultiselect(false);
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
                            const duplicatedSongs = songlist.songs.filter(song => selected.includes(song.id)).map(song => song.id);
                            const pureSelected = selected.filter(id => !duplicatedSongs.includes(id));
                            const newSonglist = {
                                ...songlist,
                                songs: [...songlist.songs, ...pureSelected.map(id => _list.find(song => song.id === id)!)]
                            };
                            const newSonglists = [...songlists];
                            newSonglists[index] = newSonglist;
                            setSonglists(newSonglists);
                            setMultiselect(false);
                        }
                    }))))
                })
            ]
        });
        menu.popup();
    }, [selected, _list, songlists]);

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
                <div className='flex flex-row items-center flex-wrap gap-2'>
                    <div className='flex items-center gap-4'>
                        <Button onClick={handleRandomPlay} variant='primary' className='flex flex-row gap-2 items-center'><span className='i-fluent:arrow-shuffle-20-regular w-5 h-5' />
                            <FormattedMessage defaultMessage='Random' />
                        </Button>
                        <Button onClick={() => {
                            setMultiselect(!multiselect);
                        }} className='flex flex-row gap-2 items-center'>
                            {multiselect ? <><span className='i-fluent:dismiss-20-regular w-5 h-5' /><FormattedMessage defaultMessage='Cancel' /></> : <><span className='i-fluent:multiselect-20-regular w-5 h-5' /><FormattedMessage defaultMessage='Multiselect' /></>}
                        </Button>
                        {multiselect && (
                            <>
                                <span className='color-text-sec font-size-sm'>
                                    <FormattedMessage defaultMessage='{total} Songs' values={{ total: selected.length }} />
                                </span>
                                <Button onClick={handleMultiselectOperate} disabled={selected.length < 1} className='flex items-center justify-center'>
                                    <span className='i-fluent:wrench-20-regular w-5 h-5' />
                                </Button>
                            </>
                        )}
                        {!scanned && (
                            <div className='flex items-center gap-2'>
                                <Spinner size='size-4' />
                                <span className='font-size-sm'>
                                    <FormattedMessage defaultMessage='Scanning...' />
                                </span>
                            </div>
                        )}
                    </div>
                    <div className='flex items-center gap-4 md:ml-auto'>
                        <Input placeholder={intl.formatMessage({ defaultMessage: 'Search' })} value={keyword} onChange={(e) => {
                            setKeyword(e.target.value);
                        }} after={<span className='i-fluent:search-20-regular' />} />
                        <span className='color-text-pri font-size-sm'>
                            <FormattedMessage defaultMessage='Sort By:' />
                        </span>
                        <Select position='left' options={sortOptions} onChange={option => {
                            setSortBy(option);
                        }} value={sortBy} />
                    </div>
                </div>
            </div>
            {list.length > 0 ? (
                <div className='h-[calc(100vh-244px)] md:h-[calc(100vh-204px)]'>
                    <Virtuoso
                        computeItemKey={(i) => `${sortBy}${i}`}
                        totalCount={barOpen ? list.length + 1 : list.length}
                        itemContent={(index) => {
                            if (index === list.length) {
                                return <div className='h-20' />;
                            }
                            const song = list[index];
                            return <SongItem song={song} selectMode={multiselect} select={selected.includes(song.id)} onSelect={(checked) => handleSelect(song.id, checked)} onClick={handleClickSong} hideBg={!(index % 2)} />;
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
