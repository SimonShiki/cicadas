import { atom } from 'jotai';
import { Song } from './storage';
import { focusAtom } from 'jotai-optics';
import { atomWithStorage } from 'jotai/utils';

export type PlayMode = 'list' | 'list-recycle' | 'single' | 'single-recycle' | 'random';

export interface NowPlaying {
    beginTime?: number;
    playing: boolean;
    song?: Song<string>;
}

export const progressJotai = atom(0);
export const backendPlayingJotai = atom(false);
export const nowPlayingJotai = atom<NowPlaying>({ playing: false});
export const playModeJotai = atomWithStorage<PlayMode>('playMode', 'list-recycle');
export const nowPlayingBarJotai = atom((get) => !!get(nowPlayingJotai).song);
export const nowPlayingPageJotai = atom(false);
export const playlistJotai = atom<Song<string>[]>([]);
export const beginTimeJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('beginTime'));
export const currentSongJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('song'));
export const playingJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('playing'));
export const volumeJotai = atomWithStorage('volume', 1);
export const bufferingJotai = atom(false);
export const streamingJotai = atom(false);
