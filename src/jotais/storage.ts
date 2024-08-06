import { atom } from 'jotai';
import { focusAtom } from 'jotai-optics';
import { Local } from '../storages/local';

export interface Song<From extends string> {
    id: string;
    name: string;
    artist?: string;
    cover?: string;
    album?: string;
    duration?: number;
    storage: From;
    path: string;
}

export interface AbstractStorage<SortOrder> {
    getSongList(order: SortOrder, filter?: string): Promise<Song<StorageMeta<SortOrder>['identifer']>[]>;
    getSongBuffer(id: string): Promise<ArrayBuffer>;
    scan(): Promise<void>;
}

export interface StorageMeta<SortOrder> {
    identifer: string;
    instance: AbstractStorage<SortOrder>;
    scanned: boolean;
    songList: Song<StorageMeta<SortOrder>['identifer']>[];
}

interface Storages {
    storages: {
        local: {
            identifer: 'local';
            instance: Local;
            scanned: boolean;
            songList: Song<'local'>[];
            
        };
        [storageName: string]: StorageMeta<string>;
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
