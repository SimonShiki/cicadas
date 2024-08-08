import { Store } from '@tauri-apps/plugin-store';

export function extractExtName (name: string) {
    const result = /(?:\.([^.]+))?$/.exec(name);
    return result ? result[1] : '';
}

export const backendStorage = new Store('cache.bin');
