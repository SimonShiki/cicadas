import { listen } from '@tauri-apps/api/event';
import { nowPlayingJotai, playlistJotai, currentSongJotai, playingJotai, PlayMode, backendPlayingJotai, playModeJotai, progressJotai, volumeJotai, bufferingJotai } from '../jotais/play';
import sharedStore from '../jotais/shared-store';
import { Song, storagesJotai } from '../jotais/storage';
import { invoke } from '@tauri-apps/api/core';
import { focusAtom } from 'jotai-optics';
import { WritableAtom } from 'jotai';
import { SetStateAction } from 'react';
import { webviewWindow } from '@tauri-apps/api';
import { ProgressBarStatus } from '@tauri-apps/api/window';

type MediaControlPayload = 'play' | 'pause' | 'toggle' | 'next' | 'previous';
type UpdateDurationPayload = number;

interface BufferUpdatePayload {
    type: 'BufferUpdate';
    data: {
        bufferProgress: number;
    }
}

interface BufferSeekingPayload {
    type: 'BufferSeeking';
}

interface BufferSeekReadyPayload {
    type: 'BufferSeekReady';
}

interface UpdateProgressPayload {
    type: 'UpdateProgress';
    data: {
        progress: number;
    }
}

type PlaybackPayload = BufferUpdatePayload | BufferSeekingPayload | BufferSeekReadyPayload | UpdateProgressPayload;

async function initializeMediaControls () {
    try {
        await invoke('init_media_controls');
        const playStatus = await invoke('get_music_status');
        sharedStore.set(playingJotai, playStatus === 'Playing');
        if (playStatus === 'Playing') {
            const progress = await invoke<number>('get_playback_progress');
            sharedStore.set(progressJotai, progress);
            sharedStore.set(backendPlayingJotai, true);
        }
        const volume = await invoke<number>('get_volume');
        sharedStore.set(volumeJotai, factorToVolume(volume));
    } catch (e) {
        console.error('Failed to initialize media controls:', e);
    }
}

async function updateMediaMetadata (song: Song<string>) {
    try {
        await invoke('update_media_metadata', {
            metadata: {
                title: song.name,
                artist: song.artist,
                album: song.album,
                cover: song.cover
            }
        });
    } catch (e) {
        console.error(e);
    }
}

async function updatePlaybackStatus (isPlaying: boolean) {
    await invoke('update_playback_status', { isPlaying });
    webviewWindow.WebviewWindow.getCurrent().setProgressBar({
        status: isPlaying ? ProgressBarStatus.Normal : ProgressBarStatus.Paused
    });
}

export async function playCurrentSong () {
    const currentSong = sharedStore.get(currentSongJotai);
    const volume = sharedStore.get(volumeJotai);
    if (!currentSong) return;
    
    pause();
    await updateMediaMetadata(currentSong);
    sharedStore.set(backendPlayingJotai, false);
    sharedStore.set(progressJotai, 0);

    if (currentSong.storage === 'local') {
        await invoke('play_local_file', { filePath: currentSong.path });
    } else {
        const storages = sharedStore.get(storagesJotai);
        const targetStorage = storages[currentSong.storage];
        if (!('getMusicURL' in targetStorage.instance)) {
            throw new Error(`storage ${currentSong.storage} doesn't implemented getMusicURL`);
        }
            
        const url = await targetStorage.instance.getMusicURL(currentSong.id);
        sharedStore.set(bufferingJotai, true);
        await invoke('play_url_stream', { url });
    }

    await invoke('set_volume', { volume: volumeToFactor(volume) });
    sharedStore.set(backendPlayingJotai, true);
    play();
}

function setupEventListeners () {
    listen<MediaControlPayload>('media-control', (e) => {
        switch (e.payload) {
        case 'play':
            play();
            break;
        case 'pause':
            pause();
            break;
        case 'toggle':
            togglePlayPause();
            break;
        case 'previous':
            previous();
            break;
        case 'next':
            next();
            break;
        }
    });

    listen<UpdateDurationPayload>('update_duration', (e) => {
        const currentSong = sharedStore.get(currentSongJotai);
        if (!currentSong) return;

        const durationJotai = focusAtom(currentSongJotai as WritableAtom<Song<string>, [SetStateAction<Song<string>>], void>, (optic) => optic.prop('duration'));
        sharedStore.set(durationJotai, e.payload);
    });

    listen<PlaybackPayload>('playback_event', (event) => {
        const { payload } = event;
        switch (payload.type) {
        case 'BufferUpdate':
            if (sharedStore.get(bufferingJotai)) {
                sharedStore.set(bufferingJotai, false);
            }

            if (payload.data.bufferProgress !== undefined) {
                // TODO: update buffer progress
            }
            break;
        case 'BufferSeeking':
            sharedStore.set(bufferingJotai, true);
            break;
        case 'BufferSeekReady': {
            const currentSong = sharedStore.get(currentSongJotai);
            if (!currentSong) return;
                    
            play();
            sharedStore.set(bufferingJotai, false);
            break;
        }
        case 'UpdateProgress':
            if (payload.data?.progress !== undefined) {
                sharedStore.set(progressJotai, payload.data.progress);
            }
            checkSongProgress();
            break;
        }
    });

    let prevSongId: string | number = -1;
    sharedStore.sub(currentSongJotai, () => {
        const currentSong = sharedStore.get(currentSongJotai);

        if (!currentSong) return;

        if (prevSongId !== currentSong.id || replayCurrentSong) {
            playCurrentSong();
            prevSongId = currentSong.id;
            if (replayCurrentSong) {
                replayCurrentSong = false;
            }
        }
    });

    let prevProgress: number;
    sharedStore.sub(progressJotai, () => {
        const progress = sharedStore.get(progressJotai);
        const currentSong = sharedStore.get(currentSongJotai);
        if (!currentSong?.duration) return;
        const percentage = Math.ceil(progress / currentSong.duration * 100000);
        if (prevProgress !== percentage) {
            prevProgress = percentage;
            webviewWindow.WebviewWindow.getCurrent().setProgressBar({
                progress: percentage
            });
        }
    });

    sharedStore.sub(playingJotai, async () => {
        const backendPlaying = sharedStore.get(backendPlayingJotai);
        const playing = sharedStore.get(playingJotai);
        if (backendPlaying) {
            if (playing) {
                await invoke('resume');
            } else {
                await invoke('pause');
            }
            await updatePlaybackStatus(playing);
        }
    });

    sharedStore.sub(volumeJotai, async () => {
        const volume = sharedStore.get(volumeJotai);
        await invoke('set_volume', { volume: volumeToFactor(volume) });
    });
}

/**
 * Since the human body does not perceive audio in a linear fashion,
 * we use a function here to map the original volume.
 * @param volume The linear volue
 * @returns the actucal amplify factor
 */
function volumeToFactor (volume: number) {
    return Math.pow(volume, 2);
}

function factorToVolume (amplitude: number) {
    return Math.sqrt(amplitude);
    
}

let replayCurrentSong = false;

async function checkSongProgress () {
    const { song, playing } = sharedStore.get(nowPlayingJotai);
    const playmode = sharedStore.get(playModeJotai);
    const progress = sharedStore.get(progressJotai);

    if (playing && song && ((song.duration ?? Infinity) / 1000) - progress <= 0.1) {
        switch (playmode) {
        case 'single-recycle':
            playCurrentSong();
            break;
        case 'single':
            pause();
            break;
        default:
            await next();
            break;
        }
    }
}

export function addToPlaylist (...songs: Song<string>[]) {
    sharedStore.set(playlistJotai, (prev) => {
        const newPlaylist = [...prev, ...songs];
        const playMode = sharedStore.get(playModeJotai);
        if (playMode === 'random') {
            shuffleNewSongs(newPlaylist, songs.length);
        }
        return newPlaylist;
    });
}

export function shuffleNewSongs (playlist: Song<string>[], newSongsCount: number) {
    for (let i = playlist.length - newSongsCount; i < playlist.length; i++) {
        const j = i + Math.floor(Math.random() * (playlist.length - i));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

export function setCurrentSong (song: Song<string>) {
    const currentSong = sharedStore.get(currentSongJotai);
    if (currentSong && currentSong.id === song.id) {
        replayCurrentSong = true;
    }
    sharedStore.set(currentSongJotai, song);
}

export function clearPlaylist () {
    sharedStore.set(playlistJotai, []);
}

export function play () {
    sharedStore.set(playingJotai, true);
}

export function pause () {
    sharedStore.set(playingJotai, false);
}

export function togglePlayPause () {
    sharedStore.set(playingJotai, (current) => !current);
}

export async function setProgress (progress: number) {
    try {
        await invoke('set_playback_progress', { progress });
        sharedStore.set(progressJotai, progress);
    } catch (e) {
        console.error('Failed to set playback progress:', e);
    }
}

export function next () {
    const playlist = sharedStore.get(playlistJotai);
    const currentSong = sharedStore.get(currentSongJotai);
    const playMode = sharedStore.get(playModeJotai);
    const currentIndex = playlist.findIndex((song) => song.id === currentSong?.id);

    const nextIndex = getNextIndex(currentIndex, playlist.length);

    if (nextIndex !== -1) {
        setCurrentSong(playlist[nextIndex]);
    } else if (playMode === 'list') {
        pause();
    }
}

export function previous () {
    const playlist = sharedStore.get(playlistJotai);
    const currentSong = sharedStore.get(currentSongJotai);
    const playMode = sharedStore.get(playModeJotai);
    const currentIndex = playlist.findIndex((song) => song.id === currentSong?.id);

    const prevIndex = getPreviousIndex(currentIndex, playlist.length);

    if (prevIndex !== -1) {
        setCurrentSong(playlist[prevIndex]);
        if (playMode !== 'single') {
            sharedStore.set(playingJotai, true);
        }
    }
}

function getNextIndex (currentIndex: number, playlistLength: number): number {
    return (currentIndex + 1) % playlistLength;
}

function getPreviousIndex (currentIndex: number, playlistLength: number): number {
    return (currentIndex - 1 + playlistLength) % playlistLength;
}

export function setPlayMode (mode: PlayMode) {
    sharedStore.set(playModeJotai, mode);
}

// Initialize the player
initializeMediaControls();
setupEventListeners();
