import greenlet from 'greenlet';

export const transformChunk = greenlet(
    async (chunk: ArrayLike<unknown> | ArrayBuffer) => {
        if (chunk instanceof ArrayBuffer) return Array.from(new Uint8Array(chunk));
        return Array.from(chunk);
        
    }
);

export const fetchArraybuffer = greenlet(
    async (url: string) => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        return buffer;
    }
);
