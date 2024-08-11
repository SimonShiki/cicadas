import { atom } from 'jotai';
import { scannedJotai, Song, storagesJotai } from './storage';
import sharedStore from './shared-store';
import { atomWithStorage } from 'jotai/utils';
import { backendStorage } from '../utils/local-utitity';

export const libraryJotai = atom<Song<string>[]>([]);
sharedStore.sub(scannedJotai, () => {
    const allScanned = sharedStore.get(scannedJotai);
    const library = sharedStore.get(libraryJotai);
    if (!allScanned || library.length > 0) return;

    const list: Song<string>[] = [];
    const storages = sharedStore.get(storagesJotai);
    for (const storageId in storages) {
        const { songList } = storages[storageId];
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

export const songlistsJotai = atom<Songlist[]>([]);
backendStorage.get('songlists').then((songlists: Songlist[] | undefined) => {
    if (!songlists) return;
    sharedStore.set(songlistsJotai, songlists);
});

sharedStore.sub(songlistsJotai, () => {
    const songlists = sharedStore.get(songlistsJotai);
    backendStorage.set('songlists', songlists);
});
