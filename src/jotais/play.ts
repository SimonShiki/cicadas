import { atom } from 'jotai';
import { Song } from './storage';
import { focusAtom } from 'jotai-optics';

export type PlayMode = 'list' | 'list-recycle' | 'single' | 'single-recycle' | 'random';

export interface NowPlaying {
    beginTime?: number;
    playmode: PlayMode;
    playing: boolean;
    volume: number;
    song?: Song<string>;
}

export const progressJotai = atom(0);
export const backendPlayingJotai = atom(false);
export const nowPlayingJotai = atom<NowPlaying>({ volume: 1, playing: false, playmode: 'list-recycle'});
export const nowPlayingBarJotai = atom((get) => !!get(nowPlayingJotai).song);
export const nowPlayingPageJotai = atom(false);
export const playlistJotai = atom<Song<string>[]>([]);
export const beginTimeJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('beginTime'));
export const playmodeJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('playmode'));
export const currentSongJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('song'));
export const playingJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('playing'));
export const volumeJotai = focusAtom(nowPlayingJotai, (optic) => optic.prop('volume'));
