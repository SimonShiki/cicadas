import { atom } from 'jotai';
import { focusAtom } from 'jotai-optics';
import { Local } from '../storages/local';

export interface Song<From extends string> {
    id: string;
    name: string;
    mtime: number;
    artist?: string;
    cover?: string;
    album?: string;
    duration?: number;
    lyrics?: string;
    storage: From;
    path: string;
}

export interface AbstractStorage {
    getSongList(): Promise<Song<StorageMeta['identifer']>[]>;
    getSongBuffer(id: string): Promise<ArrayBuffer>;
    scan(): Promise<void>;
}

export interface StorageMeta {
    identifer: string;
    instance: AbstractStorage;
    scanned: boolean;
    songList: Song<StorageMeta['identifer']>[];
}

interface Storages {
    storages: {
        local: {
            identifer: 'local';
            instance: Local;
            scanned: boolean;
            songList: Song<'local'>[];
            
        };
        [storageName: string]: StorageMeta;
    }
}

export const storageJotai = atom<Storages>({
    storages: {
        local: {
            identifer: 'local',
            instance: new Local(),
            scanned: false,
            songList: []

        }
    }
});

export const storagesJotai = focusAtom(storageJotai, (optic) => optic.prop('storages'));
export const scannedJotai = atom(
    (get) => Object.values(get(storagesJotai)).every(storage => !storage)
);
