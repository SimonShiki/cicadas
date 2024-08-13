import { invoke } from '@tauri-apps/api/core';

export async function getCachedSong (id: number) {
    return await invoke<number[] | null>('get_cached_song', {id});
}

export async function cacheSong (id: number, data: number[]) {
    await invoke('cache_song', {id, data});
}
