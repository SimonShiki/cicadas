import { listen } from '@tauri-apps/api/event';
import { nowPlayingJotai, playlistJotai, beginTimeJotai, currentSongJotai, playingJotai, PlayMode, backendPlayingJotai, playModeJotai, progressJotai, volumeJotai, streamingJotai } from '../jotais/play';
import sharedStore from '../jotais/shared-store';
import { Song, storagesJotai } from '../jotais/storage';
import { invoke } from '@tauri-apps/api/core';

type MediaControlPayload = 'play' | 'pause' | 'toggle' | 'next' | 'previous';

async function initializeMediaControls () {
    try {
        await invoke('init_media_controls');
        const playStatus = await invoke('get_music_status');
        sharedStore.set(playingJotai, playStatus === 'Playing');
        if (playStatus === 'Playing') {
            const progress = await invoke<number>('get_playback_progress');
            sharedStore.set(progressJotai, progress);
            sharedStore.set(backendPlayingJotai, true);
            sharedStore.set(beginTimeJotai, Date.now() - progress * 1000);
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
}

async function playCurrentSong () {
    const currentSong = sharedStore.get(currentSongJotai);
    const volume = sharedStore.get(volumeJotai);
    if (currentSong) {
        sharedStore.set(beginTimeJotai, Date.now());
        sharedStore.set(progressJotai, 0);
        sharedStore.set(playingJotai, true);
        await updatePlaybackStatus(true);
        await updateMediaMetadata(currentSong);
        if (currentSong.storage === 'local') {
            await invoke('play_local_file', { filePath: currentSong.path });
            await invoke('set_volume', { volume: volumeToFactor(volume) });
            sharedStore.set(backendPlayingJotai, true);
        } else {
            const storages = sharedStore.get(storagesJotai);
            const targetStorage = storages[currentSong.storage];
            if (!targetStorage.instance.getMusicStream) {
                throw new Error(`storage ${currentSong.storage} doesn't implemented music stream`);
            }
            // Start streaming
            sharedStore.set(streamingJotai, true);
            if (sharedStore.get(streamingJotai)) {
                await invoke('end_stream');
            }

            await invoke('start_streaming');
            console.log('start streaming');
            sharedStore.set(backendPlayingJotai, true);
            await invoke('set_volume', { volume: volumeToFactor(volume) });
            await pause();

            try {
                const stream = targetStorage.instance.getMusicStream(currentSong.id);
                let initChunk = false;
                for await (const chunk of stream) {
                    const streaming = sharedStore.get(streamingJotai);
                    if (!streaming) return;
                    console.log('received chunk');
                    await invoke('add_stream_chunk', { chunk: Array.from(chunk) });
                    if (!initChunk) {
                        initChunk = true;
                        await play();
                    }
                }
            } catch (e) {
                console.error('Error occurs when streaming', e);
            } finally {
                console.log('stream end');
                await invoke('end_stream');
                sharedStore.set(streamingJotai, false);
            }
        }
    }
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

    sharedStore.sub(currentSongJotai, playCurrentSong);

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

    sharedStore.sub(playingJotai, () => {
        const playing = sharedStore.get(playingJotai);
        if (playing) {
            const intervalId = setInterval(async () => {
                if (!sharedStore.get(playingJotai)) {
                    clearInterval(intervalId);
                } else {
                    await updateProgress();
                    checkSongProgress();
                }
            }, 100);
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

async function updateProgress () {
    try {
        const progress = await invoke<number>('get_playback_progress');
        sharedStore.set(progressJotai, progress);
    } catch (e) {
        console.error('Failed to get playback progress:', e);
    }
}

async function checkSongProgress () {
    const { song, playing } = sharedStore.get(nowPlayingJotai);
    const playmode = sharedStore.get(playModeJotai);
    const progress = sharedStore.get(progressJotai);

    if (playing && song && ((song.duration ?? Infinity) / 1000) - progress <= 0.1) {
        sharedStore.set(backendPlayingJotai, false);
        switch (playmode) {
        case 'single-recycle':
            await playCurrentSong();
            break;
        case 'single':
            sharedStore.set(playingJotai, false);
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

function shuffleNewSongs (playlist: Song<string>[], newSongsCount: number) {
    for (let i = playlist.length - newSongsCount; i < playlist.length; i++) {
        const j = i + Math.floor(Math.random() * (playlist.length - i));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

export function setCurrentSong (song: Song<string>) {
    sharedStore.set(currentSongJotai, song);
}

export function clearPlaylist () {
    sharedStore.set(playlistJotai, []);
    sharedStore.set(currentSongJotai, undefined);
    sharedStore.set(playingJotai, false);
    sharedStore.set(progressJotai, 0);
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
        sharedStore.set(beginTimeJotai, Date.now() - progress * 1000);
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
        sharedStore.set(currentSongJotai, playlist[nextIndex]);
        if (playMode !== 'single') {
            sharedStore.set(playingJotai, true);
        }
    } else if (playMode === 'list') {
        sharedStore.set(playingJotai, false);
    }
}

export function previous () {
    const playlist = sharedStore.get(playlistJotai);
    const currentSong = sharedStore.get(currentSongJotai);
    const playMode = sharedStore.get(playModeJotai);
    const currentIndex = playlist.findIndex((song) => song.id === currentSong?.id);

    const prevIndex = getPreviousIndex(currentIndex, playlist.length);

    if (prevIndex !== -1) {
        sharedStore.set(currentSongJotai, playlist[prevIndex]);
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
