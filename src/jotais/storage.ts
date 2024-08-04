import type { Local } from "../storages/local";
import local from "../storages/local";
import { atom } from "jotai";
import { focusAtom } from "jotai-optics";

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
    identifer: string;
    getSongList(order: SortOrder, filter?: string): Promise<Song<AbstractStorage<SortOrder>['identifer']>[]>;
    getSongBuffer(id: string): Promise<ArrayBuffer>;
}

interface Storages {
    scanning: boolean;
    storages: {
        local: Local;
        [storageName: string]: AbstractStorage<string>;
    }
}

export const storageJotai = atom<Storages>({
    scanning: false,
    storages: {
        local
    }
});

export const storagesJotai = focusAtom(storageJotai, (optic) => optic.prop('storages'));
export const scanningJotai = focusAtom(storageJotai, (optic) => optic.prop('scanning'));
