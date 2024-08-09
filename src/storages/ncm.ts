import { focusAtom } from 'jotai-optics';
import { StorageConfig, storagesConfigJotai } from '../jotais/settings';
import sharedStore from '../jotais/shared-store';
import { AbstractStorage, Song, storagesJotai } from '../jotais/storage';
import { mergeDeep } from '../utils/merge-deep';
import type { WritableAtom } from 'jotai';
import { backendStorage } from '../utils/local-utitity';

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
    ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm'));
    songlistJotai?: WritableAtom<Song<'ncm'>[], [Song<'ncm'>[]], void>;
    scannedJotai?: WritableAtom<boolean, boolean[], void>;

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

    async * getMusicStream (id: number, quality = this.config.defaultQuality) {
        const res = await fetch(`${this.config.api}song/url/v1?id=${id}&level=${quality}${this.config.cookie ? `&cookie=${this.config.cookie}` : ''}`);
        const { data } = await res.json();
        const { url } = data[0];
        if (!url) throw new Error(`Cannot get url for ${id}`);
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
}
