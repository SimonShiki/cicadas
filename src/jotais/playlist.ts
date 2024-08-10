import { Song } from './storage';

export interface Playlist {
    name: string;
    cover?: string;
    songs: Song<string>[];
}
