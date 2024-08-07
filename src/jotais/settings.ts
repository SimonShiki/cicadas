import { focusAtom } from 'jotai-optics';
import { atomWithStorage } from 'jotai/utils';

export interface StorageConfig<Idenfiter extends string> {
    identifer: Idenfiter;
}

export interface Setting {
    storages: Record<string, StorageConfig<string> | undefined>;
}

export const settingsJotai = atomWithStorage<Setting>('settings', {
    storages: {}
}, undefined, {
    getOnInit: true
});

export const storagesConfigJotai = focusAtom(settingsJotai, (optic) => optic.prop('storages'));
