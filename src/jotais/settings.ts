import { focusAtom } from 'jotai-optics';
import { atomWithStorage } from 'jotai/utils';
import { SortOptions } from '../utils/sort';

export interface StorageConfig<Idenfiter extends string> {
    identifer: Idenfiter;
}

export interface Setting {
    streaming: boolean;
    locale: string;
    storages: Record<string, StorageConfig<string> | undefined>;
}

export const settingsJotai = atomWithStorage<Setting>('settings', {
    streaming: false,
    locale: navigator.language,
    storages: {}
}, undefined, {
    getOnInit: true
});

export const localeJotai = focusAtom(settingsJotai, (optic) => optic.prop('locale'));
export const storagesConfigJotai = focusAtom(settingsJotai, (optic) => optic.prop('storages'));

export const sortOptionJotai = atomWithStorage<SortOptions>('sortOption', 'a-z', undefined, {
    getOnInit: true
});
