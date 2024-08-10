import type { Song } from '../jotais/storage';

export type SortOptions = 'default' | 'a-z' | 'z-a' | 'time_desc' | 'time_asc';

export function sortSongList<T extends string> (list: Song<T>[], by: SortOptions) {
    switch (by) {
    case 'a-z':
        return list.sort((a, b) => (a.name > b.name ? 1 : -1));
    case 'z-a':
        return list.sort((a, b) => (a.name < b.name ? 1 : -1));
    case 'time_asc':
        return list.sort((a, b) => (a.mtime > b.mtime ? 1 : -1));
    case 'time_desc':
        return list.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
    case 'default':
    default:
        return list;
    }
}

export function filterSongList<T extends string> (list: Song<T>[], keyword: string) {
    return list.filter(song => (
        song.name.includes(keyword) ||
        song.artist?.includes(keyword) || 
        song.album?.includes(keyword)
    ));
}
