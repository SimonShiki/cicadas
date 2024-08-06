import { listen } from '@tauri-apps/api/event';
import { nowPlayingJotai, playlistJotai, beginTimeJotai, currentSongJotai, playingJotai, PlayMode, backendPlayingJotai, playmodeJotai } from '../jotais/play';
import sharedStore from '../jotais/shared-store';
import { Song } from '../jotais/storage';
import { invoke } from '@tauri-apps/api/core';

type MediaControlPayload = 'play' | 'pause' | 'toggle' | 'next' | 'previous';

async function initializeMediaControls () {
    try {
        await invoke('init_media_controls');
        const playStatus = await invoke('get_music_status');
        sharedStore.set(playingJotai, playStatus === 'Playing');
    } catch (e) {
        console.error('Failed to initialize media controls:', e);
    }
}

async function updateMediaMetadata (song: Song<string>) {
    await invoke('update_media_metadata', {
        metadata: {
            title: song.name,
            artist: song.artist,
            album: song.album,
            cover: song.cover
        }
    });
}

async function updatePlaybackStatus (isPlaying: boolean) {
    await invoke('update_playback_status', { isPlaying });
}

async function playCurrentSong () {
    const currentSong = sharedStore.get(currentSongJotai);
    if (currentSong) {
        sharedStore.set(beginTimeJotai, Date.now());
        if (currentSong.storage === 'local') {
            await invoke('play_local_file', { filePath: currentSong.path });
        } else {
            // @todo web streaming
        }
        sharedStore.set(backendPlayingJotai, true);
        sharedStore.set(playingJotai, true);
        await updatePlaybackStatus(true);
        await updateMediaMetadata(currentSong);
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
            const intervalId = setInterval(() => {
                if (!sharedStore.get(playingJotai)) {
                    clearInterval(intervalId);
                } else {
                    checkSongProgress();
                }
            }, 100);
        }
    });
}

function checkSongProgress () {
    const { beginTime, song, playing, playmode } = sharedStore.get(nowPlayingJotai);

    if (playing && song && Date.now() - beginTime! >= (song.duration ?? Infinity)) {
        sharedStore.set(backendPlayingJotai, false);
        switch (playmode) {
        case 'single-recycle':
            playCurrentSong();
            break;
        case 'single':
            sharedStore.set(playingJotai, false);
            break;
        default:
            next();
            break;
        }
    }
}

export function addToPlaylist (...songs: Song<string>[]) {
    sharedStore.set(playlistJotai, (prev) => {
        const newPlaylist = [...prev, ...songs];
        const playMode = sharedStore.get(playmodeJotai);
        if (prev.length === 0 && songs.length > 0) {
            sharedStore.set(currentSongJotai, songs[0]);
        }
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

export function next () {
    const playlist = sharedStore.get(playlistJotai);
    const currentSong = sharedStore.get(currentSongJotai);
    const playMode = sharedStore.get(playmodeJotai);
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
    const playMode = sharedStore.get(playmodeJotai);
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
    sharedStore.set(playmodeJotai, mode);
}

// Initialize the player
initializeMediaControls();
setupEventListeners();
