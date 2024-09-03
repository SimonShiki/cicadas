import { atom } from 'jotai';
import { scannedJotai, Song, storagesJotai } from './storage';
import sharedStore from './shared-store';
import { backendStorage } from '../utils/local-utitity';

export const libraryJotai = atom<Song<string>[]>([]);
sharedStore.sub(scannedJotai, () => {
    const allScanned = sharedStore.get(scannedJotai);
    if (!allScanned) return;

    const list: Song<string>[] = [];
    const storages = sharedStore.get(storagesJotai);
    const idPool: Song<string>['id'][] = [];
    for (const storageId in storages) {
        let { songList } = storages[storageId];
        songList = songList.filter((song) => {
            if (!idPool.includes(song.id)) {
                idPool.push(song.id);
                return true;
            }
        });
        list.push(...songList);
    }

    sharedStore.set(libraryJotai, list);
});

export interface Album {
    id: number;
    cover: string;
    name: string;
    songs: Song<string>[];
}

export const albumsJotai = atom<Album[]>([]);
sharedStore.sub(libraryJotai, () => {
    const songs = sharedStore.get(libraryJotai);
    const albums: Record<string, Album> = {};

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const albumName = song.album;
        if (!albumName) continue;
        if (!albums[albumName]) {
            albums[albumName] = {
                id: i + 1,
                cover: song.cover || '',
                name: albumName,
                songs: []
            };
        }
        albums[albumName].songs.push(song);
    }

    sharedStore.set(albumsJotai, Object.values(albums));
});

export interface Artist {
    id: number;
    cover: string;
    name: string;
    songs: Song<string>[];
}

export const artistsJotai = atom<Artist[]>([]);
sharedStore.sub(libraryJotai, () => {
    const songs = sharedStore.get(libraryJotai);
    const artists: Record<string, Artist> = {};

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const artistName = song.artist;
        if (!artistName) continue;
        if (!artists[artistName]) {
            artists[artistName] = {
                id: i + 1,
                cover: song.cover || '',
                name: artistName,
                songs: []
            };
        }
        artists[artistName].songs.push(song);
    }

    sharedStore.set(artistsJotai, Object.values(artists));
});

export interface Songlist {
    name: string;
    songs: Song<string>[];
}

interface CachedSonglist {
    name: string;
    songs: (string | number)[];
}

export const songlistsJotai = atom<Songlist[]>([]);
sharedStore.sub(libraryJotai, async () => {
    const songs = sharedStore.get(libraryJotai);
    if (!songs.length) return;

    const cachedSonglists: CachedSonglist[] | undefined = await backendStorage.get('songlists');
    if (!cachedSonglists) return;
    const mappedSonglist : Songlist[] = [];
    for (const {name, songs: ids} of cachedSonglists) {
        mappedSonglist.push({
            name,
            songs: ids.map(id => songs.find(song => song.id === id)).filter(song => !!song)
        });
    }
    sharedStore.set(songlistsJotai, mappedSonglist);
});

sharedStore.sub(songlistsJotai, () => {
    const songlists = sharedStore.get(songlistsJotai);
    const cachedSonglists: CachedSonglist[] = [];
    for (const {name, songs} of songlists) {
        cachedSonglists.push({
            name,
            songs: songs.map((song) => song.id)
        });
    }
    backendStorage.set('songlists', cachedSonglists);
});
