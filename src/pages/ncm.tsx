import { focusAtom } from 'jotai-optics';
import { storagesConfigJotai } from '../jotais/settings';
import { useAtomValue, WritableAtom } from 'jotai';
import { NCMConfig, NCMSonglist } from '../storages/ncm';
import Input from '../components/base/input';
import { SetStateAction, useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { nowPlayingBarJotai } from '../jotais/play';
import { Song, storagesJotai, type Song as AbstractSong } from '../jotais/storage';
import SongItem from '../components/song-item';
import * as player from '../utils/player';
import Spinner from '../components/base/spinner';
import Button from '../components/base/button';
import SonglistItem from '../components/songlist-item';
import { FormattedMessage, useIntl } from 'react-intl';
import Pagination from '../components/base/pagination';

const ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm')) as unknown as WritableAtom<NCMConfig, [SetStateAction<NCMConfig>], void>;
const ncmStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('ncm'));
const profileJotai = focusAtom(ncmStorageConfigJotai, (optic) => optic.prop('profile'));

export default function NCM () {
    const ncmConfig = useAtomValue(ncmStorageConfigJotai) as NCMConfig;
    const { instance: ncmInstance } = useAtomValue(ncmStorageJotai);
    const barOpen = useAtomValue(nowPlayingBarJotai);

    const [songlist, setSonglist] = useState<NCMSonglist[]>([]);
    const profile = useAtomValue(profileJotai);
    const [searchText, setSearchText] = useState('');
    const [searchResult, setSearchResult] = useState<AbstractSong<'ncm'>[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchPage, setSearchPage] = useState(1);
    const [showSonglist, setShowSonglist] = useState<string | number | null>(null);
    const [songlistName, setSonglistName] = useState('');
    const [songlistTotalPage, setSonglistTotalPage] = useState(0);
    const [songlistPage, setSonglistPage] = useState(0);

    const [songlistDetail, setSonglistDetail] = useState<AbstractSong<'ncm'>[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (ncmConfig.loggedIn) {
            ncmInstance.getRemoteSonglist().then(setSonglist);
        }
    }, [ncmConfig, ncmInstance]);

    useEffect(() => {
        if (!isSearching) return;

        const updateSearchResult = async () => {
            if (searchText.trim() === '') {
                setSearchResult([]);
                setIsSearching(false);
                return;
            }

            const [list, hasMore] = await ncmInstance.search(searchText);
            setSearchResult(list);
            setHasMore(hasMore);
            setIsSearching(false);
        };

        setSearchPage(1);
        updateSearchResult();
    }, [isSearching, searchText, ncmInstance]);

    useEffect(() => {
        if (!showSonglist || !songlistPage) return;
        ncmInstance.getRemoteSonglistDetail(showSonglist as number, 10, songlistPage).then((detail) => {
            setSonglistDetail(detail);
        });
    }, [songlistPage]);

    useEffect(() => {
        if (showSonglist) return;
        setSonglistPage(0);
    }, [showSonglist]);

    const handleClickSong = useCallback((song: AbstractSong<'ncm'>, playlist: AbstractSong<'ncm'>[]) => {
        player.clearPlaylist();
        player.addToPlaylist(...playlist);
        player.setCurrentSong(song);
    }, []);

    const loadMore = useCallback(async () => {
        setLoadingMore(true);
        const nextPage = searchPage + 1;
        setSearchPage(nextPage);
        const [list, hasMore] = await ncmInstance.search(searchText, 10, nextPage);
        setSearchResult(prev => [...prev, ...list]);
        setHasMore(hasMore);
        setLoadingMore(false);
    }, [searchText, searchPage, ncmInstance]);

    const handleClickRemoteSonglist = useCallback(async (id: string | number, index: number) => {
        setShowSonglist(id);
        setSonglistName(songlist[index].name);
        setSonglistDetail([]);
        setSonglistPage(1);
        setSonglistTotalPage(Math.ceil(songlist[index].trackCount / 10));
    }, [songlist, ncmInstance]);

    const intl = useIntl();

    return (
        <main className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 pl-2">
                <span className="color-text-pri font-size-3xl font-500">
                    <FormattedMessage defaultMessage='NCM' />
                </span>
                <div className="flex flex-row items-center gap-4">
                    {ncmConfig.loggedIn ? (
                        <div className="flex items-center font-size-sm gap-1">
                            <span>Logged as:</span>
                            {profile ? (
                                <>
                                    <img src={profile.avatarUrl} draggable={false} className="w-6 h-6 aspect-square rounded-full" />
                                    <span>{profile.nickname}</span>
                                </>
                            ) : <Spinner size="size-4" />}
                        </div>
                    ) : (
                        <span className="font-size-sm color-text-sec">
                            <FormattedMessage defaultMessage="You've not logged in..." />
                        </span>
                    )}
                    <Input
                        placeholder={intl.formatMessage({ defaultMessage: 'Search'})}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onEnter={() => setIsSearching(true)}
                        after={<span className="i-fluent:search-20-regular" />}
                        className="m-l-auto"
                    />
                </div>
                <div className="relative overflow-hidden h-[calc(100vh-200px)]">
                    <div className={`absolute inset-0 transition-all duration-300 ms-bezier ${showSonglist !== null ? 'translate-x-[-100%]' : 'translate-x-0'}`}>
                        {renderMainContent()}
                    </div>
                    <div className={`absolute inset-0 transition-all duration-300 ms-bezier ${showSonglist !== null ? 'translate-x-0' : 'translate-x-full'}`}>
                        {renderSonglistDetail()}
                    </div>
                </div>
            </div>
        </main>
    );

    function renderMainContent () {
        if (searchResult.length > 0) {
            return renderSearchResults();
        }
        if (isSearching) {
            return renderSpinner();
        }
        return renderSonglist();
    }

    function renderSearchResults () {
        return (
            <div className="h-full">
                <Virtuoso
                    totalCount={hasMore ? searchResult.length + 1 : searchResult.length}
                    itemContent={(index) => {
                        if (index === searchResult.length) {
                            return renderLoadMoreButton();
                        }
                        const song = searchResult[index];
                        return <SongItem onAddToLib={(song) => {
                            ncmInstance.addToLib(song as Song<'ncm'>);
                        }} song={song} onClick={() => handleClickSong(song, searchResult)} hideBg={!(index % 2)} />;
                    }}
                />
            </div>
        );
    }

    function renderSonglist () {
        return (
            <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center gap-2">
                    <span className="font-(500 size-2xl)">
                        <FormattedMessage defaultMessage='Remote Songlist' />
                    </span>
                </div>
                {songlist.length > 0 ? (
                    <Virtuoso
                        className="flex-1"
                        totalCount={barOpen ? songlist.length + 1 : songlist.length}
                        itemContent={(index) => {
                            if (index === songlist.length) {
                                return <div className="h-20" />;
                            }
                            const list = songlist[index];
                            return <SonglistItem id={list.id} total={list.trackCount} index={index} name={list.name} cover={list.coverImgUrl} onClick={handleClickRemoteSonglist} hideBg={!(index % 2)} />;
                        }}
                    />
                ) : (
                    <div className="flex-1 flex justify-center items-center">
                        {ncmConfig.loggedIn ? <Spinner /> : <span className="color-text-sec">
                            <FormattedMessage defaultMessage='Sign in to get the song list...' />
                        </span>}
                    </div>
                )}
            </div>
        );
    }

    function renderSonglistDetail () {
        return (
            <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center gap-2">
                    <span className="font-(500 size-2xl)">{songlistName}</span>
                    <Button size="sm" className="flex items-center" onClick={() => setShowSonglist(null)}>
                        <span className="i-fluent:chevron-left-16-regular w-3 h-3" />
                        <span>
                            <FormattedMessage defaultMessage='Back' />
                        </span>
                    </Button>
                </div>
                {songlistDetail.length > 0 ? (
                    <Virtuoso
                        className="flex-1"
                        totalCount={songlistDetail.length}
                        itemContent={(index) => {
                            const song = songlistDetail[index];
                            return <SongItem onAddToLib={(song) => {
                                ncmInstance.addToLib(song as Song<'ncm'>);
                            }} song={song} onClick={() => handleClickSong(song, songlistDetail)} hideBg={!(index % 2)} />;
                        }}
                    />
                ) : (
                    <div className='w-full h-full flex justify-center items-center'>
                        <Spinner />
                    </div>
                )}
                <Pagination totalPages={songlistTotalPage} className={`mx-auto ${barOpen ? 'mb-20' : ''}`} currentPage={songlistPage} onPageChange={setSonglistPage} />
            </div>
        );
    }

    function renderSpinner () {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner />
            </div>
        );
    }

    function renderLoadMoreButton () {
        return (
            <div className="w-full justify-center flex">
                <Button disabled={loadingMore} className={barOpen ? 'mt-4 mb-24' : 'mt-4'} onClick={loadMore}>
                    {loadingMore ? intl.formatMessage({ defaultMessage: 'Loading...' }) : intl.formatMessage({ defaultMessage: 'Load More'})}
                </Button>
            </div>
        );
    }
}
