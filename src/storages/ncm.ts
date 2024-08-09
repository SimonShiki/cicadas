import { focusAtom } from 'jotai-optics';
import { StorageConfig, storagesConfigJotai } from '../jotais/settings';
import sharedStore from '../jotais/shared-store';
import { AbstractStorage, Song, storagesJotai } from '../jotais/storage';
import { mergeDeep } from '../utils/merge-deep';
import type { WritableAtom } from 'jotai';
import { backendStorage } from '../utils/local-utitity';

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

type NCMQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';

export interface NCMConfig extends StorageConfig<'ncm'> {
    cookie?: string;
    loggedIn?: boolean;
    api: string;
    syncSonglist: boolean;
    defaultQuality: NCMQuality;
}

const defaultConfig: NCMConfig = {
    identifer: 'ncm',
    api: 'https://netease-cloud-music-api-theta-drab.vercel.app/',
    defaultQuality: 'standard',
    loggedIn: false,
    syncSonglist: false
};

export class NCM implements AbstractStorage {
    private ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm'));
    private songlistJotai?: WritableAtom<Song<'ncm'>[], [Song<'ncm'>[]], void>;
    private scannedJotai?: WritableAtom<boolean, boolean[], void>;
    private bufferCache = new Map<number, ArrayBuffer>();

    constructor () {
        this.initCookie();
        queueMicrotask(() => {
            this.initConfig();
            this.initSongList();
        });

        this.scan = this.scan.bind(this);
        this.getSongList = this.getSongList.bind(this);
    }

    private async initSongList () {
        if (!(await backendStorage.has('cachedNCMSong'))) {
            await backendStorage.set('cachedNCMSong', []);
            return;
        }

        const cache: Song<'ncm'>[] = (await backendStorage.get('cachedNCMSong'))!;
        this.scanned = true;
        this.songList = cache;
    }

    async scan () {
        // @todo
    }

    async getSongList () {
        return this.songList;
    }

    private get config () {
        return (sharedStore.get(this.ncmStorageConfigJotai) ?? defaultConfig) as NCMConfig;
    }

    private set config (config: NCMConfig) {
        sharedStore.set(this.ncmStorageConfigJotai, config);
    }

    private set songList (list: Song<'ncm'>[]) {
        sharedStore.set(this.songlistJotai!, list);
    }

    private get songList () {
        return sharedStore.get(this.songlistJotai!);
    }

    private set scanned (scanned: boolean) {
        sharedStore.set(this.scannedJotai!, scanned);
    }

    private async initCookie () {
        const ncmCookie = this.config.cookie;
        if (!ncmCookie) {
            // Use guest cookie
            const res = await fetch(`${this.config.api}register/anonimous`);
            const { cookie } = await res.json();
            this.config = Object.assign({}, this.config, {
                cookie: cookie as string
            });
        }
    }

    private initConfig () {
        const currentConfig = sharedStore.get(this.ncmStorageConfigJotai) ?? {};
        const config = mergeDeep(defaultConfig, currentConfig) as NCMConfig;
        sharedStore.set(this.ncmStorageConfigJotai, config);
        const ncmStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('ncm'));
        this.songlistJotai = focusAtom(ncmStorageJotai, (optic) => optic.prop('songList'));
        this.scannedJotai = focusAtom(ncmStorageJotai, (optic) => optic.prop('scanned'));
    }

    private async getMusicURL (id: number, quality = this.config.defaultQuality) {
        const res = await fetch(`${this.config.api}song/url/v1?id=${id}&level=${quality}${this.config.cookie ? `&cookie=${this.config.cookie}` : ''}`);
        const { data } = await res.json();
        const { url } = data[0];
        if (!url) throw new Error(`Cannot get url for ${id}`);
        return url as string;
    }

    async * getMusicStream (id: number, quality = this.config.defaultQuality) {
        const url = await this.getMusicURL(id, quality);
        const musicRes = await fetch(url);
        if (!musicRes.body) {
            throw new Error(`The music response has no body (${musicRes.status})`);
        }
        const reader = musicRes.body.getReader();
        while (1) {
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
        }
    }

    async getMusicBuffer (id: number, quality = this.config.defaultQuality) {
        const url = await this.getMusicURL(id, quality);
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        return buffer;
    }

    async search (keyword: string, limit = 10, page = 1) {
        const offset = (page - 1) * limit;
        const res = await fetch(`${this.config.api}search?keywords=${keyword}&limit=${limit}&offset=${offset}`);
        const { result } = await res.json();
        console.log(keyword, limit, page, result);
        const mappedList = await Promise.all(
            (result.songs as NCMSearchResult[]).map(async (song) => {
                const res = await fetch(`${this.config.api}album?id=${song.album.id}`);
                const { album } = await res.json();
                return ({
                    id: song.id,
                    name: song.name,
                    duration: song.duration,
                    mtime: song.album.publishTime ?? 0,
                    album: song.album.name,
                    artist: song.artists[0].name,
                    cover: album?.picUrl,
                    storage: 'ncm' as const
                }) as Song<'ncm'>;
            })
        );
        return [mappedList, result.hasMore as boolean] as const;
    }
}
