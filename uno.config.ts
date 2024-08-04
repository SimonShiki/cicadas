// uno.config.ts
import { defineConfig, presetIcons, presetUno, transformerVariantGroup } from 'unocss';
import { presetScrollbar } from 'unocss-preset-scrollbar';
import { transformerDirectives } from 'unocss';

export default defineConfig({
    presets: [presetUno({
        dark: 'media'
    }), presetIcons(), presetScrollbar()],
    transformers: [transformerVariantGroup(), transformerDirectives()],
    theme: {
        colors: {
            text: {
                pri: '#171717',
                sec: '#666666',
                dark: {
                    pri: '#ededed',
                    sec: '#a1a1a1',
                }
            },
            outline: {
                pri: '#ebebeb',
                sec: '#c9c9c9',
                ter: '#a8a8a8',
                dark: {
                    pri: '#2e2e2e',
                    sec: '#454545',
                    ter: '#878787'
                }
            },
            bg: {
                pri: '#f2f2f2',
                sec: '#ebebeb',
                ter: '#e6e6e6',
                dark: {
                    pri: '#1a1a1a',
                    sec: '#1f1f1f',
                    ter: '#292929'
                }
            },
            fg: {
                pri: '#853d90',
                success: '#50e3c2',
                warn: '#f5a623',
                error: '#ee0000'
            }
        }
    }
});
