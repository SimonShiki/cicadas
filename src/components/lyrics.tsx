import { useCallback, useEffect, useRef, useState } from 'react';
import { ParsedLyrics, parseLyrics } from '../utils/lyric-parser';
import { useAtomValue } from 'jotai';
import { progressJotai } from '../jotais/play';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import * as player from '../utils/player';

interface LyricsProps {
    lyrics: string;
    className?: string;
}

export default function Lyrics ({lyrics, className = ''}: LyricsProps) {
    const [parsedLyrics, setParsedLyrics] = useState<ParsedLyrics | string>('');
    const progress = useAtomValue(progressJotai) * 1000;
    const [prevHighlight, setPrevHighlight] = useState(0);
    const [lastScrolled, setLastScrolled] = useState(-1001);
    const virtuosoRef = useRef <VirtuosoHandle>(null);

    useEffect(() => {
        if (!lyrics) return;
        setParsedLyrics(parseLyrics(lyrics));
        virtuosoRef.current?.scrollTo({ top: 0 });
    }, [lyrics]);

    useEffect(() => {
        if (typeof parsedLyrics !== 'object') return;
        for (let i = 0; i < parsedLyrics.lines.length; i++) {
            if (!shouldHighlight(i)) continue;
            if (prevHighlight !== i && Date.now() - lastScrolled > 1000) {
                virtuosoRef.current?.scrollToIndex(Math.max(0, i - 1));
                setPrevHighlight(i);
            }
            break;
        }
    }, [progress]);

    const shouldHighlight = useCallback((index: number) => {
        if (typeof parsedLyrics !== 'object') return false;
        const next = parsedLyrics.lines[index + 1];
        const line = parsedLyrics.lines[index];
        return progress > line.time && progress < (next?.time ?? Infinity);
    }, [parsedLyrics, progress]);

    if (typeof parsedLyrics === 'string') {
        return (
            <div className={`color-white ${className}`}>
                {parsedLyrics}
            </div>
        );
    }

    return (
        <Virtuoso
            className={`flex flex-col scroll-smooth *:text-pretty overflow-x-hidden scrollbar-none ${className}`}
            totalCount={parsedLyrics.lines.length}
            ref={virtuosoRef}
            onScroll={() => setLastScrolled(Date.now())}
            itemContent={(index) => {
                const line = parsedLyrics.lines[index];
                const highlight = shouldHighlight(index);

                return (
                    <div className='flex flex-col my-2 *:text-pretty bg-white bg-op-0 hover:bg-op-20 transition-colors p-2 rounded-md' onClick={() => {
                        player.setProgress(line.time / 1000);
                    }}>
                        <span className={`color-white transition-all font-size-xl lg:font-size-2xl font-bold ${highlight ? 'opacity-90 font-size-2xl lg:font-size-3xl' : 'blur-1 opacity-20'}`}>
                            {line.content}
                        </span>
                        {line.translation && (
                            <span className={`color-white transition-all font-size-sm font-600 ${highlight ? 'opacity-90 lg:font-size-lg' : 'blur-1 opacity-20'}`}>
                                {line.translation}
                            </span>
                        )}
                    </div>
                );
            }}
        />
    );
}
