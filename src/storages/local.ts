import { StorageConfig, storagesConfigJotai } from '../jotais/settings';
import sharedStore from '../jotais/shared-store';
import { AbstractStorage, Song, storagesJotai } from '../jotais/storage';
import { focusAtom } from 'jotai-optics';
import { audioDir } from '@tauri-apps/api/path';
import { backendStorage } from '../utils/local-utitity';
import type { WritableAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { mergeDeep } from '../utils/merge-deep';

type AudioScanBehavior = 'startup' | 'daily' | 'weekly' | 'never';

export interface LocalConfig extends StorageConfig<'local'> {
    folders: string[];
    autoScanBehavior: AudioScanBehavior;
}

const defaultConfig: LocalConfig = {
    identifer: 'local',
    folders: [await audioDir()],
    autoScanBehavior: 'never'
};

export class Local implements AbstractStorage {
    localStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('local'));
    songlistJotai?: WritableAtom<Song<'local'>[], [Song<'local'>[]], void>;
    scannedJotai?: WritableAtom<boolean, boolean[], void>;

    constructor () {
        queueMicrotask(() => {
            this.initConfig();
            this.initSongList();
        });

        this.scan = this.scan.bind(this);
    }

    private initConfig () {
        const currentConfig = sharedStore.get(this.localStorageConfigJotai) ?? {};
        const config = mergeDeep(defaultConfig, currentConfig) as LocalConfig;
        sharedStore.set(this.localStorageConfigJotai, config);
        const localStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('local'));
        this.songlistJotai = focusAtom(localStorageJotai, (optic) => optic.prop('songList'));
        this.scannedJotai = focusAtom(localStorageJotai, (optic) => optic.prop('scanned'));
    }

    private async initSongList () {
        const cachedLocalSong = await backendStorage.get('cachedLocalSong');
        if (!cachedLocalSong) {
            await this.scan();
            return;
        }
        if (cachedLocalSong.length < 1) {
            await this.scan();
            return;
        }
        this.songList = cachedLocalSong;
        this.scanned = true;

        // Auto-scan
        const { autoScanBehavior } = this.getConfig();
        if (autoScanBehavior === 'startup') {
            this.scan();
        }
        // TODO: Implement other auto-scan behaviors
    }

    private set songList (list: Song<'local'>[]) {
        sharedStore.set(this.songlistJotai!, list);
    }

    private get songList () {
        return sharedStore.get(this.songlistJotai!);
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
        const scanPromises = folders.map(folder => invoke<Song <'local'>[]>('scan_folder', { path: folder }));
        const scannedFolders = await Promise.all<Song<'local'>[]>(scanPromises);

        const buffer: Song<'local'>[] = scannedFolders.flat();

        this.songList = buffer;
        await backendStorage.set('cachedLocalSong', this.songList);

        this.scanned = true;
    }
}

export default Local;
