import { Store } from '@tauri-apps/plugin-store';

export function extractExtName (name: string) {
    const result = /(?:\.([^.]+))?$/.exec(name);
    return result ? result[1] : '';
}

export function createDataUrl (buffer: ArrayBuffer, mimeType: string): string {
    // Convert ArrayBuffer to Base64 string
    const base64 = btoa(
        new Uint8Array(buffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Construct and return the data URL
    return `data:${mimeType};base64,${base64}`;
}

export const backendStorage = new Store('cache.bin');
