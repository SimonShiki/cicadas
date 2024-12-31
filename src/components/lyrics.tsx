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
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollTimeoutRef = useRef<number>(0);
    const isScrollingRef = useRef(false);

    useEffect(() => {
        if (!lyrics) return;
        setParsedLyrics(parseLyrics(lyrics));
        virtuosoRef.current?.scrollTo({ top: 0 });
    }, [lyrics]);

    const shouldHighlight = useCallback((index: number) => {
        if (typeof parsedLyrics !== 'object') return false;
        const next = parsedLyrics.lines[index + 1];
        const line = parsedLyrics.lines[index];
        const lineEndTime = line.endTime ?? (next?.time ?? Infinity);
        return progress >= line.time && progress < lineEndTime;
    }, [parsedLyrics, progress]);

    const scrollToIndex = useCallback((index: number) => {
        if (isScrollingRef.current) return;
        
        isScrollingRef.current = true;
        window.cancelAnimationFrame(scrollTimeoutRef.current!);
        
        scrollTimeoutRef.current = window.requestAnimationFrame(() => {
            virtuosoRef.current?.scrollToIndex(Math.max(0, index - 1));
            setLastScrolled(Date.now());
            
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 100);
        });
    }, []);

    useEffect(() => {
        if (typeof parsedLyrics !== 'object') return;
        
        for (let i = 0; i < parsedLyrics.lines.length; i++) {
            if (!shouldHighlight(i)) continue;
            if (prevHighlight !== i && Date.now() - lastScrolled > 1000) {
                scrollToIndex(i);
                setPrevHighlight(i);
            }
            break;
        }
    }, [progress, parsedLyrics, prevHighlight, lastScrolled, shouldHighlight, scrollToIndex]);

    const handleLineClick = useCallback((time: number) => {
        player.setProgress(time / 1000);
    }, []);

    const renderItem = useCallback((index: number) => {
        if (typeof parsedLyrics !== 'object') return null;
        const line = parsedLyrics.lines[index];
        const highlight = shouldHighlight(index);

        const renderContent = () => {
            if (!line.wordTimes?.length) {
                return line.content;
            }

            return line.wordTimes.map((word, i) => {
                const isWordActive = highlight && progress >= word.time;
                const isWordPlaying = highlight && progress >= word.time && progress < word.endTime;
                // Consider words longer than 1 second as accented
                const isAccent = word.duration && word.duration > 1000;
                
                // Calculate animation progress (0-1)
                const playProgress = isWordPlaying && isAccent
                    ? Math.min((progress - word.time) / (word.duration ?? Infinity), 1)
                    : 0;
                
                // Ensure progressive highlighting
                const prevWordsHighlighted = line.wordTimes!
                    .slice(0, i)
                    .every(prevWord => progress >= prevWord.time);
                
                const shouldHighlight = isWordActive && prevWordsHighlighted;

                // Extract spaces to preserve word spacing while maintaining animations
                const leadingSpaces = word.text.match(/^\s*/)?.[0] ?? '';
                const trailingSpaces = word.text.match(/\s*$/)?.[0] ?? '';
                const content = word.text.slice(leadingSpaces.length, word.text.length - trailingSpaces.length);

                return (
                    <span key={word.time}>
                        {leadingSpaces && <span className="opacity-0">{leadingSpaces}</span>}
                        <span 
                            className={`
                                inline-block transition-all duration-200
                                ${shouldHighlight ? 'opacity-90' : 'opacity-20 blur-1'}
                                ${isAccent ? 'transform-gpu' : ''}
                            `}
                            style={{
                                transform: isAccent 
                                    ? `translateY(${playProgress * 4}px)` 
                                    : undefined,
                                textShadow: isAccent && isWordPlaying
                                    ? `0 0 ${playProgress * 8}px rgba(255,255,255,${playProgress * 0.5})`
                                    : undefined
                            }}
                        >
                            {content}
                        </span>
                        {trailingSpaces && <span className="opacity-0">{trailingSpaces}</span>}
                    </span>
                );
            });
        };

        return (
            <div 
                className='flex flex-col my-2 *:text-pretty bg-white bg-op-0 hover:bg-op-20 transition-colors p-2 rounded-md' 
                onClick={() => handleLineClick(line.time)}
            >
                <div className={`color-white transition-all flex flex-col font-size-xl lg:font-size-2xl font-bold ${
                    highlight ? 'opacity-90 font-size-2xl lg:font-size-3xl' : 'blur-1 opacity-60'
                }`}>
                    <div>{renderContent()}</div>
                    {line.translation && (
                        <div className={`font-size-sm lg:font-size-base font-semibold ${highlight ? 'opacity-90' : 'opacity-40'}`}>
                            {line.translation}
                        </div>
                    )}
                </div>
            </div>
        );
    }, [parsedLyrics, shouldHighlight, progress]);

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
            itemContent={renderItem}
        />
    );
}
