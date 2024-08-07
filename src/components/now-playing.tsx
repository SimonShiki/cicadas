import { useAtom, useAtomValue } from 'jotai';
import { currentSongJotai, beginTimeJotai, nowPlayingBarJotai, nowPlayingPageJotai, playingJotai, progressJotai } from '../jotais/play';
import Card from './base/card';
import defaultCover from '../assets/default-cover.png';
import Button from './base/button';
import * as player from '../utils/player';
import Progress from './base/progress';
import { useState, useCallback } from 'react';
import Slider from './base/slider';

function formatMilliseconds (ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function NowPlaying () {
    const [fullscreen, setFullscreen] = useAtom(nowPlayingPageJotai);
    const [playing, setPlaying] = useAtom(playingJotai);
    const barOpen = useAtomValue(nowPlayingBarJotai);
    const song = useAtomValue(currentSongJotai);
    const progress = useAtomValue(progressJotai);
    
    const [isAnimating, setIsAnimating] = useState(false);

    const handlePlayPause = useCallback(() => {
        setPlaying(playing => !playing);
    }, [playing, setPlaying]);

    const toggleFullscreen = useCallback(() => {
        setIsAnimating(true);
        setFullscreen(!fullscreen);
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 300); // 300ms matches the animation duration
    }, [fullscreen, setFullscreen]);

    const handleChangePlayProgress = useCallback(async (value: number) => {
        const actualElapsedSecs = value * song!.duration! / 100000;
        await player.setProgress(actualElapsedSecs);
    }, [song]);

    if (!barOpen || !song) return null;

    return (
        <>
            <div className='absolute bottom-0 left-0 flex w-full pointer-events-none'>
                <Card className='!bg-white pointer-events-auto mx-auto mb-4 flex flex-col shadow-xl w-80vw lg:w-200 !p-0 overflow-hidden'>
                    <Progress value={progress * 1000} max={song.duration} height='h-0.5' />
                    <div className='flex items-center m-4 justify-between'>
                        <div className='flex flex-row gap-4 w-1/3'>
                            <img draggable={false} src={song.cover ?? defaultCover} alt={song.name} className='rounded-md w-10 h-10 cursor-pointer' onClick={toggleFullscreen} />
                            <div className='flex flex-col gap-1 lg:max-w-60 overflow-hidden *:text-truncate'>
                                <span className='color-text-pri font-size-sm font-500'>{song.name}</span>
                                <span className='color-text-sec font-size-xs'>{song.album}</span>
                            </div>
                        </div>
                        <div className='flex-1 flex justify-center'>
                            <div className='flex flex-row gap-2 color-text-pri items-center'>
                                <span className='i-fluent:previous-24-filled w-4 h-4 cursor-pointer' onClick={player.previous} />
                                <Button rounded iconOnly className='flex justify-center items-center w-9 h-9' onClick={handlePlayPause}>
                                    <span className={`${playing ? 'i-fluent:pause-24-filled' : 'i-fluent:play-24-filled'} w-6 h-6`} />
                                </Button>
                                <span className='i-fluent:next-24-filled w-4 h-4 cursor-pointer' onClick={player.next} />
                            </div>
                        </div>
                        <div className='flex gap-2 items-center w-1/3 justify-end'>
                            <span className='i-fluent:speaker-2-20-regular w-4 h-4' />
                            <span className='i-fluent:navigation-play-20-regular w-4 h-4' />
                        </div>
                    </div>
                </Card>
            </div>
            {(fullscreen || isAnimating) && (
                <div
                    className={`absolute top-0 left-0 w-full h-full ms-bezier animate-duration-300 ${fullscreen ? 'animate-slide-in-up' : 'animate-slide-out-down'}`}
                    style={{ backgroundImage: `url("${song.cover}")` }}
                >
                    <div className='w-full h-full backdrop-filter backdrop-blur-256 bg-black bg-op-40 flex flex-col items-center justify-center'>
                        <img draggable={false} src={song.cover} className='shadow-md border-outline-pri rounded-md w-30vw lg:w-80 aspect-square' />
                        <div className='absolute bottom-0 w-full h-20 mt-auto py-4 bg-black bg-op-20 border-t-(1 solid text-sec) border-op-40'>
                            <div className='flex flex-row gap-6 items-center px-6'>
                                <span className='color-outline-pri font-size-sm'>{formatMilliseconds(progress * 1000)}</span>
                                <div className='w-full'>
                                    <Slider value={Math.min(progress * 1000 / song.duration! * 100, 100)} onChange={handleChangePlayProgress} step={0.01} />
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
                                    <span onClick={handlePlayPause} className={`${playing ? 'i-fluent:pause-24-filled' : 'i-fluent:play-24-filled'} w-8 h-8 cursor-pointer`} />
                                    <span className='i-fluent:next-24-filled w-6 h-6 cursor-pointer' onClick={player.next} />
                                </div>
                                <div className='absolute flex gap-2 pt-3 right-6 items-center color-white'>
                                    <span className='i-fluent:speaker-2-20-filled w-5 h-5' />
                                    <span className='i-fluent:navigation-play-20-filled w-5 h-5' />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
