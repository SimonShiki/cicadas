
import { nowPlayingJotai, playlistJotai, beginTimeJotai, currentSongJotai, playingJotai, PlayMode, backendPlayingJotai, playmodeJotai } from '../jotais/play';
import sharedStore from '../jotais/shared-store';
import { Song } from '../jotais/storage';
import { invoke } from '@tauri-apps/api/core';

try {
    await invoke('init_media_controls');
    const playStatus = await invoke('get_music_status');
    sharedStore.set(playingJotai, playStatus === 'Playing');
} catch (e) {
    console.error(e);
}

sharedStore.sub(currentSongJotai, () => {
    const currentSong = sharedStore.get(currentSongJotai);
    if (currentSong) {
        sharedStore.set(beginTimeJotai, Date.now());
        if (currentSong.storage === 'local') {
            setTimeout(async () => {
                await invoke('play_local_file', { filePath: currentSong.path });
                sharedStore.set(backendPlayingJotai, true);
            }, 0);
        } else {
            // @todo web streaming
        }
        invoke('update_media_metadata', {
            metadata: {
                title: currentSong.name,
                artist: currentSong.artist,
                album: currentSong.album,
                cover: currentSong.cover
            }
        });
    }
});

sharedStore.sub(playingJotai, () => {
    const backendPlaying = sharedStore.get(backendPlayingJotai);
    if (backendPlaying) {
        const playing = sharedStore.get(playingJotai);
        if (playing) {
            invoke('resume');
            invoke('update_playback_status', {
                isPlaying: true
            });
        } else {
            invoke('pause');
            invoke('update_playback_status', {
                isPlaying: false
            });
        }
    }
});

sharedStore.sub(playingJotai, async () => {
    const playing = sharedStore.get(playingJotai);
    if (playing) {
        const intervalId = setInterval(() => {
            const playing = sharedStore.get(playingJotai);
            if (!playing) clearInterval(intervalId);
            else checkList();
        }, 100);
    }
});

function checkList () {
    const { beginTime, song, playing, playmode } = sharedStore.get(nowPlayingJotai);

    // Check if the current song has finished
    if (playing && song && Date.now() - beginTime! >= (song.duration ?? Infinity)) {
        sharedStore.set(backendPlayingJotai, false);
        switch (playmode) {
        case 'list':
            next();
            break;
        case 'list-recycle':
            next();
            break;
        case 'single':
            sharedStore.set(playingJotai, false);
            break;
        case 'single-recycle':
            play();
            break;
        case 'random':
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
            // If the playlist was empty, set the first added song as the current song
            sharedStore.set(currentSongJotai, songs[0]);
            sharedStore.set(playingJotai, true);
        }
        if (playMode === 'random') {
            // Shuffle the new songs before adding them to the playlist
            for (let i = newPlaylist.length - songs.length; i < newPlaylist.length; i++) {
                const j = i + Math.floor(Math.random() * (newPlaylist.length - i));
                [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
            }
        }
        return newPlaylist;
    });
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

export function next () {
    const playlist = sharedStore.get(playlistJotai);
    const currentSong = sharedStore.get(currentSongJotai);
    const playMode = sharedStore.get(playmodeJotai);
    const currentIndex = playlist.findIndex((song) => song.id === currentSong?.id);
    let nextIndex: number;

    switch (playMode) {
    case 'list':
    case 'list-recycle':
        nextIndex = (currentIndex + 1) % playlist.length;
        break;
    case 'single':
    case 'single-recycle':
        nextIndex = currentIndex;
        break;
    case 'random':
        nextIndex = Math.floor(Math.random() * playlist.length);
        break;
    }

    if (nextIndex !== -1) {
        sharedStore.set(currentSongJotai, playlist[nextIndex]);
        sharedStore.set(playingJotai, true);
    } else if (playMode === 'list') {
        sharedStore.set(playingJotai, false);
    }
}

export function previous () {
    const playlist = sharedStore.get(playlistJotai);
    const currentSong = sharedStore.get(currentSongJotai);
    const playMode = sharedStore.get(playmodeJotai);
    const currentIndex = playlist.findIndex((song) => song.id === currentSong?.id);
    let prevIndex: number;

    switch (playMode) {
    case 'list':
    case 'list-recycle':
        prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        break;
    case 'single':
    case 'single-recycle':
        prevIndex = currentIndex;
        break;
    case 'random':
        prevIndex = Math.floor(Math.random() * playlist.length);
        break;
    }

    if (prevIndex !== -1) {
        sharedStore.set(currentSongJotai, playlist[prevIndex]);
        sharedStore.set(playingJotai, true);
    }
}

export function setPlayMode (mode: PlayMode) {
    sharedStore.set(playmodeJotai, mode);
}
