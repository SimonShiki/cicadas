import { focusAtom } from 'jotai-optics';
import { StorageConfig, storagesConfigJotai } from '../jotais/settings';
import sharedStore from '../jotais/shared-store';
import { AbstractStorage, Song, storagesJotai } from '../jotais/storage';
import { mergeDeep } from '../utils/merge-deep';
import type { SetStateAction, WritableAtom } from 'jotai';
import { backendStorage } from '../utils/local-utitity';
import { fetchArraybuffer } from '../utils/chunk-transformer';

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

export interface NCMSonglist {
    subscribers: unknown[];
    subscribed: boolean;
    creator: {
        defaultAvatar: boolean;
        province: number;
        authStatus: number;
        followed: boolean;
        avatarUrl: string;
        accountStatus: number;
        gender: number;
        city: number;
        birthday: number;
        userId: number;
        userType: number;
        nickname: string;
        signature: string;
        description: string;
        detailDescription: string;
        avatarImgId: number;
        backgroundImgId: number;
        backgroundUrl: string;
        authority: number;
        mutual: boolean;
        expertTags: string[] | null;
        experts: Record<string, unknown> | null;
        djStatus: number;
        vipType: number;
        remarkName: string | null;
        authenticationTypes: number;
        avatarDetail: Record<string, unknown> | null;
        avatarImgIdStr: string;
        backgroundImgIdStr: string;
        anchor: boolean;
        avatarImgId_str: string;
    };
    artists: unknown[] | null;
    tracks: unknown[] | null;
    top: boolean;
    updateFrequency: string | null;
    backgroundCoverId: number;
    backgroundCoverUrl: string | null;
    titleImage: number;
    titleImageUrl: string | null;
    englishTitle: string | null;
    opRecommend: boolean;
    recommendInfo: string | null;
    subscribedCount: number;
    cloudTrackCount: number;
    userId: number;
    totalDuration: number;
    coverImgId: number;
    privacy: number;
    trackUpdateTime: number;
    trackCount: number;
    updateTime: number;
    commentThreadId: string;
    coverImgUrl: string;
    specialType: number;
    anonimous: boolean;
    createTime: number;
    highQuality: boolean;
    newImported: boolean;
    trackNumberUpdateTime: number;
    playCount: number;
    adType: number;
    description: string | null;
    tags: string[];
    ordered: boolean;
    status: number;
    name: string;
    id: number;
    coverImgId_str: string;
    sharedUsers: unknown[] | null;
    shareStatus: string | null;
    copied: boolean;
}

interface NCMSonglistTrack {
    name: string;
    id: number;
    pst: number;
    t: number;
    ar: {
        id: number;
        name: string;
        tns: string[];
        alias: string[];
    }[];
    alia: string[];
    pop: number;
    st: number;
    rt: string;
    fee: number;
    v: number;
    crbt: unknown | null; // Assuming crbt can have an unknown structure or be null
    cf: string;
    al: {
        id: number;
        name: string;
        picUrl: string;
        tns: string[];
        pic: number;
    };
    dt: number;
    h: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    } | null; // High quality object may be null
    m: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    } | null; // Medium quality object may be null
    l: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    } | null; // Low quality object may be null
    sq: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    } | null; // High-definition quality object may be null
    hr: unknown | null; // Assuming hr can have an unknown structure or be null
    a: unknown | null; // Assuming a can have an unknown structure or be null
    cd: string;
    no: number;
    rtUrl: string | null;
    ftype: number;
    rtUrls: string[];
    djId: number;
    copyright: number;
    s_id: number;
    mark: number;
    originCoverType: number;
    originSongSimpleData: unknown | null; // Assuming originSongSimpleData can have an unknown structure or be null
    tagPicList: unknown[] | null; // Assuming tagPicList can be an array of unknown objects or null
    resourceState: boolean;
    version: number;
    songJumpInfo: unknown | null; // Assuming songJumpInfo can have an unknown structure or be null
    entertainmentTags: unknown[] | null; // Assuming entertainmentTags can be an array of unknown objects or null
    awardTags: unknown[] | null; // Assuming awardTags can be an array of unknown objects or null
    single: number;
    noCopyrightRcmd: unknown | null; // Assuming noCopyrightRcmd can have an unknown structure or be null
    mv: number;
    rurl: string | null;
    mst: number;
    cp: number;
    rtype: number;
    publishTime: number;
}

interface NCMProfile {
    userId: number;
    userType: number;
    nickname: string;
    avatarImgId: number;
    avatarUrl: string;
    backgroundImgId: number;
    backgroundUrl: string;
    signature: string;
    createTime: number;
    userName: string;
    accountType: number;
    shortUserName: string;
    birthday: number;
    authority: number;
    gender: number;
    accountStatus: number;
    province: number;
    city: number;
    authStatus: number;
    description: string | null;
    detailDescription: string | null;
    defaultAvatar: boolean;
    expertTags: string[] | null;
    experts: Record<string, unknown> | null;
    djStatus: number;
    locationStatus: number;
    vipType: number;
    followed: boolean;
    mutual: boolean;
    authenticated: boolean;
    lastLoginTime: number;
    lastLoginIP: string;
    remarkName: string | null;
    viptypeVersion: number;
    authenticationTypes: number;
    avatarDetail: null;
    anchor: boolean;
}

type NCMQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';

export interface NCMConfig extends StorageConfig<'ncm'> {
    cookie?: string;
    loggedIn?: boolean;
    uid?: number;
    profile?: NCMProfile,
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
    private ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm')) as unknown as WritableAtom<NCMConfig, [SetStateAction<NCMConfig>], void>;
    private songlistJotai?: WritableAtom<Song<'ncm'>[], [Song<'ncm'>[]], void>;
    private scannedJotai?: WritableAtom<boolean, boolean[], void>;

    constructor () {
        this.initCookie();
        queueMicrotask(() => {
            this.initConfig();
            this.initSongList();
            this.initListener();
        });

        this.scan = this.scan.bind(this);
    }

    private initListener () {
        const loggedInJotai = focusAtom(this.ncmStorageConfigJotai, (optic) => optic.prop('loggedIn'));
        sharedStore.sub(loggedInJotai, async () => {
            const ncmConfig = sharedStore.get(this.ncmStorageConfigJotai) as NCMConfig;
            const loggedIn = sharedStore.get(loggedInJotai);
            if (loggedIn) {
                const { userId } = await this.getProfile();
                sharedStore.set(this.ncmStorageConfigJotai, {...ncmConfig, ...{uid: userId}});
            }
        });
    }

    private async initSongList () {
        const cachedNCMSong = await backendStorage.get('cachedNCMSong');
        if (!cachedNCMSong) {
            await backendStorage.set('cachedNCMSong', []);
            return;
        }

        this.songList = cachedNCMSong;
        this.scanned = true;
    }

    async scan () {
        // @todo
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
        const buffer = await fetchArraybuffer(url);
        return buffer;
    }

    async search (keyword: string, limit = 10, page = 1) {
        const offset = (page - 1) * limit;
        const res = await fetch(`${this.config.api}search?keywords=${keyword}&limit=${limit}&offset=${offset}`);
        const { result } = await res.json();
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

    async getProfile () {
        if (!this.config.loggedIn) throw 'not logged in';
        if (this.config.profile) return this.config.profile;

        const res = await fetch(`${this.config.api}user/account?cookie=${this.config.cookie}`);
        const { profile } = await res.json();
        const profileJotai = focusAtom(this.ncmStorageConfigJotai, (optic) => optic.prop('profile'));
        sharedStore.set(profileJotai, profile);
        return profile;
    }

    async getRemoteSonglist (uid = this.config.uid) {
        if (!this.config.uid) return [];
        const res = await fetch(`${this.config.api}user/playlist?uid=${uid}${this.config.cookie ? `&cookie=${this.config.cookie}` : ''}`);
        const { playlist } = await res.json();
        return playlist as NCMSonglist[];
    }

    async getRemoteSonglistDetail (id: string | number, limit = 10, page = 1) {
        const offset = (page - 1) * limit;
        const res = await fetch(`${this.config.api}playlist/track/all?id=${id}&limit=${limit}&offset=${offset}${this.config.cookie ? `&cookie=${this.config.cookie}` : ''}`);
        const data = await res.json();
        if (!data.songs) {
            console.error(data);
        }
        const mappedList: Song<'ncm'>[] = (data.songs as NCMSonglistTrack[]).map(song => ({
            id: song.id,
            name: song.name,
            cover: song.al.picUrl,
            artist: song.ar[0].name,
            album: song.al.name,
            mtime: song.publishTime,
            storage: 'ncm'
        }));
        return mappedList;
    }
}
