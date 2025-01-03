import { useAtom, useAtomValue } from 'jotai';
import { bufferingJotai, currentSongJotai, nowPlayingBarJotai, nowPlayingPageJotai, playingJotai, playlistJotai, PlayMode, playModeJotai, progressJotai, volumeJotai } from '../jotais/play';
import Card from './base/card';
import defaultCover from '../assets/default-cover.png';
import Button from './base/button';
import * as player from '../utils/player';
import Progress from './base/progress';
import { useState, useCallback, useEffect } from 'react';
import Slider from './base/slider';
import Tooltip from './base/tooltip';
import Lyrics from './lyrics';
import PlaylistTooltip from './playlist-tooltip';

const playModeIconMap: Record<PlayMode, string> = {
    list: 'i-fluent:arrow-repeat-all-off-20-regular',
    'list-recycle': 'i-fluent:arrow-repeat-all-20-regular',
    single: 'i-fluent:arrow-right-20-regular',
    'single-recycle': 'i-fluent:arrow-repeat-1-20-regular',
    random: 'i-fluent:arrow-shuffle-20-regular'
};

const playModeCycle = ['list', 'list-recycle', 'single', 'single-recycle', 'random'] as const;

function formatMilliseconds (ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function NowPlaying () {
    const [globalFullscreen, setGlobalFullscreen] = useAtom(nowPlayingPageJotai);
    const [localFullscreen, setLocalFullscreen] = useState(globalFullscreen);
    const [playing, setPlaying] = useAtom(playingJotai);
    const playMode = useAtomValue(playModeJotai);
    const [volume, setVolume] = useAtom(volumeJotai);
    const barOpen = useAtomValue(nowPlayingBarJotai);
    const song = useAtomValue(currentSongJotai);
    const progress = useAtomValue(progressJotai);
    const buffering = useAtomValue(bufferingJotai);

    const [isAnimating, setIsAnimating] = useState(false);

    const handlePlayPause = useCallback(() => {
        setPlaying(playing => !playing);
    }, [setPlaying]);

    useEffect(() => {
        setIsAnimating(true);
        setLocalFullscreen(globalFullscreen);
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 300); // 300ms matches the animation duration
    }, [globalFullscreen]);

    const handleChangePlayProgress = useCallback(async (value: number) => {
        if (!song?.duration) return;
        const actualElapsedSecs = value * song!.duration! / 100000;
        await player.setProgress(actualElapsedSecs);
    }, [song]);

    if (!barOpen || !song) return null;

    return (
        <>
            <div className='absolute bottom-0 left-0 flex w-full pointer-events-none'>
                <Card className='!bg-white !dark:bg-bg-dark-ter pointer-events-auto mx-auto mb-4 flex flex-col shadow-xl w-80vw lg:w-200 !p-0'>
                    <Progress value={progress * 1000} infinite={buffering} max={song.duration} height='h-0.5' />
                    <div className='flex items-center m-4 justify-between'>
                        <div className='flex flex-row gap-4 w-1/3'>
                            <img draggable={false} src={song.cover ?? defaultCover} alt={song.name} className='rounded-md w-10 h-10 cursor-pointer' onClick={() => {
                                setGlobalFullscreen(true);
                            }} />
                            <div className='flex flex-col gap-1 lg:max-w-60 overflow-hidden *:text-truncate'>
                                <span className='color-text-pri dark:color-text-dark-pri font-size-sm font-500'>{song.name}</span>
                                <span className='color-text-sec dark:color-text-dark-sec font-size-xs'>{song.album}</span>
                            </div>
                        </div>
                        <div className='flex-1 flex justify-center'>
                            <div className='flex flex-row gap-2 color-text-pri dark:color-text-dark-pri items-center'>
                                <span className='i-fluent:previous-24-filled w-4 h-4 cursor-pointer' onClick={player.previous} />
                                <Button rounded disabled={buffering} iconOnly className='flex justify-center items-center w-9 h-9' onClick={handlePlayPause}>
                                    <span className={`${playing ? 'i-fluent:pause-24-filled' : 'i-fluent:play-24-filled'} w-6 h-6`} />
                                </Button>
                                <span className='i-fluent:next-24-filled w-4 h-4 cursor-pointer' onClick={player.next} />
                            </div>
                        </div>
                        <div className='flex gap-2 items-center w-1/3 justify-end'>
                            <span className={`w-5 h-5 cursor-pointer ${playModeIconMap[playMode]}`} onClick={() => {
                                player.setPlayMode(playModeCycle[(playModeCycle.indexOf(playMode) + 1) % playModeCycle.length]);
                            }} />
                            <Tooltip
                                content={(
                                    <div className='flex pb-4 h-20 flex-col items-center gap-2'>
                                        <span className='font-size-sm'>{Math.floor(volume * 100)}</span>
                                        <Slider vertical value={volume * 100} onChange={value => setVolume(value / 100)} />
                                    </div>
                                )}
                                className='flex w-5 h-5'
                                trigger='click'
                            >
                                <span className='i-fluent:speaker-2-20-regular w-5 h-5 cursor-pointer' />
                            </Tooltip>
                            <PlaylistTooltip />
                        </div>
                    </div>
                </Card>
            </div>
            {(localFullscreen || isAnimating) && (
                <div
                    className={`translate-z-0 absolute top-0 left-0 w-full h-full ms-bezier animate-duration-300 overflow-hidden ${localFullscreen ? 'animate-slide-in-up' : 'animate-slide-out-down'}`}
                >
                    <div 
                        className='absolute inset-[-10px] bg-cover blur-96 scale-180'
                        style={{ backgroundImage: `url("${song.cover}")` }}
                    />
                    <div 
                        className='absolute inset-0 bg-black bg-op-40'
                    />
                    <div className='relative w-full h-full flex flex-col items-center justify-center'>
                        <div className='flex gap-12'>
                            <img draggable={false} src={song.cover} className='shadow-md border-outline-pri rounded-md w-30vw lg:w-80 object-cover aspect-square' />
                            {song.lyrics && <Lyrics lyrics={song.lyrics} className='h-60 w-50vw max-w-50vw lg:w-120 lg:max-w-120 overflow-x-hidden' />}
                        </div>
                        <div className='absolute bottom-0 w-full h-20 mt-auto py-4 bg-black bg-op-20 border-t-(1 solid text-sec) border-op-40'>
                            <div className='flex flex-row gap-6 items-center px-6'>
                                <span className='color-outline-pri font-size-sm'>{formatMilliseconds(progress * 1000)}</span>
                                <div className='w-full'>
                                    <Slider value={Math.min(progress * 1000 / song.duration! * 100, 100)} disabled={buffering} onChange={handleChangePlayProgress} step={0.01} />
                                </div>
                                <span className='color-outline-pri font-size-sm'>{formatMilliseconds(song.duration!)}</span>
                            </div>
                            <div className='flex flex-row px-6 py-2'>
                                <div className='flex flex-col grow-0.5 w-0'>
                                    <span className='color-white text-truncate max-w-30vw'>{song.name}</span>
                                    <span className='color-outline-sec font-size-sm text-truncate max-w-30vw'>{song.album}</span>
                                </div>
                                <div className='flex flex-row gap-4 color-white items-center'>
                                    <span className='i-fluent:previous-24-filled w-6 h-6 cursor-pointer' onClick={player.previous} />
                                    <span onClick={() => {
                                        if (!buffering) {
                                            handlePlayPause();
                                        }
                                    }} className={`${playing ? 'i-fluent:pause-24-filled' : 'i-fluent:play-24-filled'} w-8 h-8 cursor-pointer transition-opacity ${buffering ? 'op-40 !cursor-initial' : ''}`} />
                                    <span className='i-fluent:next-24-filled w-6 h-6 cursor-pointer' onClick={player.next} />
                                </div>
                                <div className='absolute flex gap-2 pt-3 right-6 items-center color-white'>
                                    <span className={`w-5 h-5 cursor-pointer ${playModeIconMap[playMode]}`} onClick={() => {
                                        player.setPlayMode(playModeCycle[(playModeCycle.indexOf(playMode) + 1) % playModeCycle.length]);
                                    }} />
                                    <Tooltip
                                        content={(
                                            <div className='flex pb-4 h-20 flex-col items-center gap-2'>
                                                <span className='font-size-sm'>{Math.floor(volume * 100)}</span>
                                                <Slider vertical value={volume * 100} onChange={value => setVolume(value / 100)} />
                                            </div>
                                        )}
                                        className='flex w-5 h-5'
                                        trigger='click'
                                    >
                                        <span className='i-fluent:speaker-2-20-filled cursor-pointer w-5 h-5' />
                                    </Tooltip>
                                    <PlaylistTooltip />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
