import { focusAtom } from 'jotai-optics';
import { storagesConfigJotai } from '../jotais/settings';
import { useAtomValue } from 'jotai';
import { NCMConfig } from '../storages/ncm';
import Input from '../components/base/input';
import { useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { nowPlayingBarJotai } from '../jotais/play';
import type { Song as AbstractSong } from '../jotais/storage';
import SongItem from '../components/song-item';
import * as player from '../utils/player';
import Spinner from '../components/base/spinner';

interface NCMProfile {
    nickname: string;
    avatarUrl: string;
}

interface NCMSearchResult {
    id: number;
    name: string;
    artists: {
        id: number;
        name: string;
        picUrl: string | null;
        alias: string[];
        albumSize: number;
        picId: number;
        fansGroup: string | null;
        img1v1Url: string;
        img1v1: number;
        trans: string | null;
    }[];
    album: {
        id: number;
        name: string;
        artist: {
            id: number;
            name: string;
            picUrl: string | null;
            alias: string[];
            albumSize: number;
            picId: number;
            fansGroup: string | null;
            img1v1Url: string;
            img1v1: number;
            trans: string | null;
        };
        publishTime: number;
        size: number;
        copyrightId: number;
        status: number;
        picId: number;
        alia: string[];
        mark: number;
    };
    duration: number;
    copyrightId: number;
    status: number;
    alias: string[];
    rtype: number;
    ftype: number;
    mvid: number;
    fee: number;
    rUrl: string | null;
    mark: number;
}

const ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm'));

export default function NCM () {
    const ncmConfig = useAtomValue(ncmStorageConfigJotai) as NCMConfig;
    const [profile, setProfile] = useState<NCMProfile | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResult, setSearchResult] = useState<AbstractSong<'ncm'>[]>([]);
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
            const res = await fetch(`${ncmConfig.api}search?keywords=${searchText}`);
            const { result } = await res.json();
            setSearchResult((result.songs as NCMSearchResult[]).map((song) => ({
                id: song.id,
                name: song.name,
                duration: song.duration,
                mtime: song.album.publishTime ?? 0,
                album: song.album.name,
                artist: song.artists[0].name,
                cover: song.artists[0].img1v1Url,
                storage: 'ncm'
            })));
            setSearching(false);
        }
        updateSearchResult();
    }, [searching]);
    const handleClickSong = useCallback((song: AbstractSong<'ncm'>) => {
        player.clearPlaylist();
        player.addToPlaylist(...searchResult);
        player.setCurrentSong(song);
    }, [searchResult]);
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
                            totalCount={barOpen ? searchResult.length + 1 : searchResult.length}
                            itemContent={(index) => {
                                if (index === searchResult.length) {
                                    return <div className='h-20' />;
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
