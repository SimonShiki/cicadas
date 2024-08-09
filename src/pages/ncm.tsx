import { focusAtom } from 'jotai-optics';
import { storagesConfigJotai } from '../jotais/settings';
import { useAtomValue } from 'jotai';
import { NCMConfig } from '../storages/ncm';
import Input from '../components/base/input';
import { useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { nowPlayingBarJotai } from '../jotais/play';
import { storagesJotai, type Song as AbstractSong } from '../jotais/storage';
import SongItem from '../components/song-item';
import * as player from '../utils/player';
import Spinner from '../components/base/spinner';
import Button from '../components/base/button';

interface NCMProfile {
    nickname: string;
    avatarUrl: string;
}

const ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm'));
const ncmStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('ncm'));

export default function NCM () {
    const ncmConfig = useAtomValue(ncmStorageConfigJotai) as NCMConfig;
    const [profile, setProfile] = useState<NCMProfile | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchPage, setSearchPage] = useState(1);
    const [searchResult, setSearchResult] = useState<AbstractSong<'ncm'>[]>([]);
    const {instance: ncmInstance} = useAtomValue(ncmStorageJotai);
    const barOpen = useAtomValue(nowPlayingBarJotai);
    useEffect(() => {
        async function getProfile () {
            // @todo
        }
        if (ncmConfig.loggedIn) {
            getProfile();
        } else {
            setProfile(null);
        }
    }, [ncmConfig]);
    useEffect(() => {
        if (!searching) return;
        async function updateSearchResult () {
            const [list, hasMore] = await ncmInstance.search(searchText);
            setSearchResult(list);
            setHasMore(hasMore);
            setSearching(false);
        }
        setSearchPage(1);
        updateSearchResult();
    }, [searching]);
    const handleClickSong = useCallback((song: AbstractSong<'ncm'>) => {
        player.clearPlaylist();
        player.addToPlaylist(...searchResult);
        player.setCurrentSong(song);
    }, [searchResult]);
    const loadMore = useCallback(async () => {
        setLoadingMore(true);
        setSearchPage(searchPage + 1);
        const [list, hasMore] = await ncmInstance.search(searchText, 10, searchPage + 1);
        setSearchResult([...searchResult, ...list]);
        setHasMore(hasMore);
        setLoadingMore(false);
    }, [searchText, searchPage]);
    return (
        <main className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4 pl-2'>
                <span className='color-text-pri font-size-3xl font-500'>NCM</span>
                <div className='flex flex-row items-center gap-4'>
                    {ncmConfig.loggedIn ? (
                        <div className='flex items-center font-size-sm'>
                            <span>Logged as:</span>
                        </div>
                    ) : (
                        <span className = 'font-size-sm color-text-sec'>You&apos;ve not logged in...</span>
                    )}
                    <Input placeholder='Search' value={searchText} onChange={(e) => {
                        setSearchText(e.target.value);
                    }} onEnter={() => {
                        setSearching(true);
                    }} after={<span className='i-fluent:search-20-regular' />} className='m-l-auto' />
                </div>
                {searchResult.length > 0 ? (
                    <div className='h-[calc(100vh-204px)]'>
                        <Virtuoso
                            totalCount={hasMore ? searchResult.length + 1 : searchResult.length}
                            itemContent={(index) => {
                                if (index === searchResult.length) {
                                    return (
                                        <div className='w-full justify-center flex'>
                                            <Button disabled={loadingMore} className={barOpen ? 'mt-4 mb-24' : 'mt-4'} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load More'}</Button>
                                        </div>
                                    );
                                }
                                const song = searchResult[index];
                                return <SongItem song={song} onClick={handleClickSong} hideBg={!(index % 2)} />;
                            }}
                        />
                    </div>
                ) : (
                    searching ? (
                        <div className='flex justify-center items-center pt-20vh'>
                            <Spinner />
                        </div>
                    ) : null
                )}
            </div>
        </main>
    );
}
