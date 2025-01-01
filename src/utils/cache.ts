import { invoke } from '@tauri-apps/api/core';

export async function getCacheSize () {
    return await invoke<number>('get_cache_size');
}

export async function clearCache () {
    await invoke('clear_cache');
}
