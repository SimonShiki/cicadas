import * as idb from 'idb-keyval';

export function extractExtName (name: string) {
    const result = /(?:\.([^.]+))?$/.exec(name);
    return result ? result[1] : '';
}

export const backendStorage = idb;
