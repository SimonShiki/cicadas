import { StorageConfig, storagesConfigJotai } from '../jotais/settings';
import sharedStore from '../jotais/shared-store';
import { AbstractStorage, Song, storagesJotai } from '../jotais/storage';
import { focusAtom } from 'jotai-optics';
import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { resolve, audioDir } from '@tauri-apps/api/path';
import { MetaFile } from 'music-metadata-wasm';
import { extractExtName, createDataUrl, backendStorage } from '../utils/local-utitity';
import type { WritableAtom } from 'jotai';

type SortOrder = 'add_asc' | 'add_desc' | 'a-z' | 'z-a';

interface LocalConfig extends StorageConfig<'local'> {
    folders: string[];
}

const defaultConfig: LocalConfig = {
    identifer: 'local',
    folders: [await audioDir()]
};
const allowedFormats = ['ogg', 'wav', 'flac', 'mp3', 'aiff', 'aac'];

export class Local implements AbstractStorage<SortOrder> {
    localStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('local'));
    songlistJotai?: WritableAtom<Song<'local'>[], [Song<'local'>[]], void>;
    scannedJotai?: WritableAtom<boolean, boolean[], void>;

    constructor () {
        queueMicrotask(() => {
            this.initConfig();
            this.initSongList();
        });
    }

    private initConfig () {
        const currentConfig = sharedStore.get(this.localStorageConfigJotai) ?? {};
        const config = Object.assign({}, defaultConfig, currentConfig);
        sharedStore.set(this.localStorageConfigJotai, config);
        const localStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('local'));
        this.songlistJotai = focusAtom(localStorageJotai, (optic) => optic.prop('songList'));
        this.scannedJotai = focusAtom(localStorageJotai, (optic) => optic.prop('scanned'));
    }

    private async initSongList () {
        if (!(await backendStorage.has('cachedLocalSong'))) {
            await this.scan();
            return;
        }

        const cache: Song<'local'>[] = (await backendStorage.get('cachedLocalSong'))!;
        if (cache.length < 1) {
            await this.scan();
            return;
        }
        this.scanned = true;
        this.songList = cache;
    }

    private set songList (list: Song<'local'>[]) {
        sharedStore.set(this.songlistJotai!, list);
    }

    private set scanned (scanned: boolean) {
        sharedStore.set(this.scannedJotai!, scanned);
    }

    private getConfig () {
        return (sharedStore.get(this.localStorageConfigJotai) ?? defaultConfig) as LocalConfig;
    }

    async scan () {
        this.scanned = false;

        const { folders } = this.getConfig();
        this.songList = [];
        for (const folder of folders) {
            this.songList.push(...(await this.scanFolder(folder)));
        }

        await backendStorage.set('cachedLocalSong', this.songList);
        backendStorage.save();

        this.scanned = true;
    }

    private async scanFolder (path: string) {
        const entries = await readDir(path);
        const songs: Song<'local'>[] = [];
        for (const entry of entries) {
            const subPath = await resolve(path, entry.name);
            if (entry.isDirectory) {
                songs.push(...(await this.scanFolder(subPath)));
                continue;
            }

            const extName = extractExtName(entry.name);
            if (!allowedFormats.includes(extName)) continue;

            const buffer = await readFile(subPath);
            try {
                const meta = new MetaFile(buffer);
                const coverData = meta.pictures[0];
                this.songList.push({
                    id: subPath,
                    name: meta.title,
                    artist: meta.artist,
                    album: meta.album,
                    cover: createDataUrl(coverData.data, coverData.mimeType ?? 'image/png'),
                    duration: meta.duration,
                    storage: 'local',
                    path: subPath
                });
                meta.dispose();
            } catch (e) {
                console.error(e);
                this.songList.push({
                    id: subPath,
                    name: entry.name,
                    storage: 'local',
                    path: subPath
                });
            }
        }
        return songs;
    }

    async getSongBuffer (id: string) {
        const song = this.songList.find(song => song.id === id);
        if (!song) throw new Error(`song with id ${id} not exist`);
        const path = song.path;

        return await readFile(path);
    }

    async getSongList (order: SortOrder, filter?: string) {
        return this.songList;
    }
}

export default Local;