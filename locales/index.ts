import en from './en.json';
import zhCN from './zh-cn.json';

export default {
    en,
    'zh-CN': zhCN
} as const;

export const langMap = [
    {value: 'en', label: 'English'},
    {value: 'zh-CN', label: '简体中文'}
];
