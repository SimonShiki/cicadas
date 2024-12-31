export function parseLyrics (raw: string): ParsedLyrics | string {
    const lines = raw.split('\n');
    const parsedLyrics: ParsedLyrics = { lines: [] };
    let isStandardFormat = false;
    let currentLine: Line | null = null;

    const timeRegex = /[<[]((\d{1,3}):(\d{1,2})\.(\d{1,6}))[>\]]/g;

    for (const line of lines) {
        if (line.trim() === '') continue;

        // Handle metadata
        if (line.startsWith('[by:')) {
            parsedLyrics.by = line.slice(4, -1);
            isStandardFormat = true;
            continue;
        }

        // Validate line starts with timestamp
        const firstTime = line.match(/^\[(\d{1,3}):(\d{1,2})\.(\d{1,6})\]/);
        if (!firstTime) {
            // Handle inline translation without timestamp
            if (isStandardFormat && currentLine && !currentLine.translation) {
                currentLine.translation = line.trim();
            }
            continue;
        }

        isStandardFormat = true;
        const remainingLine = line;
        const matches: string[] = [];
        const texts: string[] = [];
        let lastIndex = 0;

        // Preserve original spaces in word segments by not trimming
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const match = timeRegex.exec(remainingLine);
            if (!match) break;
            
            const text = remainingLine.slice(lastIndex, match.index);
            if (text !== '') texts.push(text);
            matches.push(match[1]);
            lastIndex = match.index + match[0].length;
        }

        const finalText = remainingLine.slice(lastIndex);
        if (finalText !== '') texts.push(finalText);

        // Parse the first timestamp for line start
        const [startMin, startSec, startMs] = matches[0].split(/[:.]/).map(Number);
        const startTime = startMin * 60000 + startSec * 1000 + parseInt(startMs.toString().padEnd(3, '0'));

        if (texts.length === 0) continue;

        // Check if this timestamp matches the previous line's timestamp
        // If so, treat this as a translation line
        if (parsedLyrics.lines.length > 0) {
            const prevLine = parsedLyrics.lines[parsedLyrics.lines.length - 1];
            if (prevLine.time === startTime) {
                prevLine.translation = texts.join('');
                continue;
            }
        }

        // Handle inline translation (text after the main lyrics without timestamp)
        const mainContent = texts[0];
        const translation = texts.slice(1).join('').trim();

        currentLine = {
            time: startTime,
            content: mainContent || '',
            translation: translation || undefined,
            wordTimes: []
        };

        // Process word-by-word lyrics
        if (matches.length > 1) {
            currentLine.content = texts.join('');
            currentLine.translation = undefined;
            
            // Convert all timestamps to milliseconds
            const times = matches.map(timeStr => {
                const [min, sec, ms] = timeStr.split(/[:.]/).map(Number);
                return min * 60000 + sec * 1000 + parseInt(ms.toString().padEnd(3, '0'));
            });

            // First timestamp is line start, last is line end according to SPL spec
            currentLine.time = times[0];
            currentLine.endTime = times[times.length - 1];
            
            // Calculate duration for each word segment for accent detection
            for (let i = 0; i < texts.length; i++) {
                const startTime = times[i];
                const endTime = times[i + 1];
                const duration = endTime - startTime;

                currentLine.wordTimes!.push({
                    time: startTime,
                    endTime,
                    text: texts[i],
                    duration
                });
            }
        }

        parsedLyrics.lines.push(currentLine);
    }

    return isStandardFormat ? parsedLyrics : raw;
}

export function mergeLyrics (rawLyrics: string, translatedLyrics?: string | null) {
    if (!translatedLyrics) {
        return rawLyrics;
    }

    const rawParsed = parseLyrics(rawLyrics);
    const translatedParsed = parseLyrics(translatedLyrics);

    if (typeof rawParsed === 'string' || typeof translatedParsed === 'string') {
        return rawLyrics;
    }

    const mergedLines: string[] = [];
    const translatedMap = new Map(translatedParsed.lines.map(line => [line.time, line.content]));

    for (const line of rawParsed.lines) {
        if (line.wordTimes?.length) {
            // Handle word-by-word lyrics
            let lineContent = `[${formatTime(line.time)}]`;
            for (const word of line.wordTimes) {
                lineContent += word.text + `<${formatTime(word.time)}>`;
            }
            if (line.endTime) {
                lineContent += `[${formatTime(line.endTime)}]`;
            }
            mergedLines.push(lineContent);

            // Add translation if exists
            const translatedContent = translatedMap.get(line.time);
            if (translatedContent) {
                mergedLines.push(`[${formatTime(line.time)}]${translatedContent}`);
            }
        } else {
            // Handle regular lyrics
            mergedLines.push(`[${formatTime(line.time)}]${line.content}`);
            const translatedContent = translatedMap.get(line.time);
            if (translatedContent) {
                mergedLines.push(`[${formatTime(line.time)}]${translatedContent}`);
            }
        }
    }

    const byLine = rawParsed.by ? `[by:${rawParsed.by}]` : (translatedParsed.by ? `[by:${translatedParsed.by}]` : '');
    return byLine + (byLine ? '\n' : '') + mergedLines.join('\n');
}

function formatTime (ms: number) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export interface ParsedLyrics {
    by?: string;
    lines: Line[];
}

export interface Line {
    time: number;
    content: string;
    translation?: string;
    wordTimes?: {
        time: number;
        endTime: number;
        text: string;
        duration?: number;
    }[];
    endTime?: number;
}
