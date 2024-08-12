export function parseLyrics (raw: string): ParsedLyrics | string {
    const lines = raw.split('\n');
    const parsedLyrics: ParsedLyrics = { lines: [] };
    let isStandardFormat = false;

    for (const line of lines) {
        if (line.trim() === '') continue; // Skip empty lines

        // Check for metadata
        if (line.startsWith('[by:')) {
            parsedLyrics.by = line.slice(4, -1);
            isStandardFormat = true;
            continue;
        }

        // Check for time-stamped lines (supporting both .00 and .000 formats)
        const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
        if (match) {
            isStandardFormat = true;
            const [, minutes, seconds, milliseconds, content] = match;
            const time = parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds.padEnd(3, '0'));

            // Skip empty lines or metadata lines
            if (content.trim() === '' || content.includes(':')) {
                continue;
            }

            if (parsedLyrics.lines.length > 0 && parsedLyrics.lines[parsedLyrics.lines.length - 1].time === time) {
                // This is a translation of the previous line
                parsedLyrics.lines[parsedLyrics.lines.length - 1].translation = content.trim();
            } else {
                parsedLyrics.lines.push({ time, content: content.trim() });
            }
        } else if (isStandardFormat) {
            // If we've seen standard format before but this line doesn't match, it might be a continuation
            if (parsedLyrics.lines.length > 0) {
                const lastLine = parsedLyrics.lines[parsedLyrics.lines.length - 1];
                if (lastLine.translation) {
                    lastLine.translation += ' ' + line.trim();
                } else {
                    lastLine.content += ' ' + line.trim();
                }
            }
        }
    }

    // If no standard format was detected, return the raw string
    if (!isStandardFormat) {
        return raw;
    }

    return parsedLyrics;
}

export function mergeLyrics (rawLyrics: string, translatedLyrics?: string | null) {
    if (!translatedLyrics) {
        return rawLyrics;
    }

    const rawParsed = parseLyrics(rawLyrics);
    const translatedParsed = parseLyrics(translatedLyrics);

    if (typeof rawParsed === 'string' || typeof translatedParsed === 'string') {
        // If either parsing failed, return the raw lyrics
        return rawLyrics;
    }

    const mergedLines: string[] = [];
    const translatedMap = new Map(translatedParsed.lines.map(line => [line.time, line.content]));

    for (const line of rawParsed.lines) {
        const translatedContent = translatedMap.get(line.time);
        if (translatedContent) {
            mergedLines.push(`[${formatTime(line.time)}]${line.content}`);
            mergedLines.push(`[${formatTime(line.time)}]${translatedContent}`);
        } else {
            mergedLines.push(`[${formatTime(line.time)}]${line.content}`);
        }
    }

    // Add the [by:] line if present in either lyrics
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
}
