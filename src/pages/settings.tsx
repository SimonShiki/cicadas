import { focusAtom } from 'jotai-optics';
import Button from '../components/base/button';
import Card from '../components/base/card';
import Input from '../components/base/input';
import Select from '../components/base/select';
import Switch from '../components/base/switch';
import { storagesConfigJotai } from '../jotais/settings';
import { SetStateAction, useAtom, useAtomValue, WritableAtom } from 'jotai';
import type { LocalConfig } from '../storages/local';
import { useCallback, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { storagesJotai } from '../jotais/storage';

const autoScanOptions = [
    {value: 'startup', label: 'Each startup'} as const,
    { value: 'daily', label: 'Daily' } as const,
    { value: 'weekly', label: 'Weekly' } as const,
    { value: 'never', label: 'Never' } as const
];

const localStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('local')) as unknown as WritableAtom<LocalConfig, [SetStateAction<LocalConfig>], void>;
const localFoldersJotai = focusAtom(localStorageConfigJotai, (optic) => optic.prop('folders'));
const localAutoScanJotai = focusAtom(localStorageConfigJotai, (optic) => optic.prop('autoScanBehavior'));
const localStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('local'));
const localScannedJotai = focusAtom(localStorageJotai, (optic) => optic.prop('scanned'));

export default function Settings () {
    const [localFolders, setLocalFolders] = useAtom(localFoldersJotai);
    const [localAutoScan, setLocalAutoScan] = useAtom(localAutoScanJotai);
    const [localFolderExpanded, setLocalFolderExpanded] = useState(false);
    const {instance: localStorage} = useAtomValue(localStorageJotai);
    const localScanned = useAtomValue(localScannedJotai);

    const handleAddNewFolder = useCallback(async () => {
        const folders = await open({
            multiple: true,
            directory: true
        });
        if (!folders) return;

        setLocalFolders([...localFolders, ...folders]);
    }, [setLocalFolders]);

    const handleDeleteFolder = useCallback((index: number) => {
        const newFolders = [...localFolders];
        newFolders.splice(index, 1);
        setLocalFolders(newFolders);
    }, [setLocalFolders]);

    return (
        <main className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2 pl-2'>
                <span className='color-text-pri font-size-3xl font-500 grow-1'>Settings</span>
                <span className='color-text-pri font-size-sm my-2'>Local</span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:folder-24-regular w-5 h-5' />
                        <span className='grow-1'>Folders to scan</span>
                        <Button className='flex flex-row gap-2 items-center' onClick={handleAddNewFolder}>
                            <span className='i-fluent:folder-add-20-regular w-5 h-5' />Add Folders
                        </Button>
                        <div onClick={() => {
                            setLocalFolderExpanded(!localFolderExpanded);
                        }} className='bg-black bg-op-0 hover:bg-op-10 transition-colors w-5 h-5 flex items-center justify-center p-1 rounded-md'>
                            <span className={`i-fluent:chevron-down-20-regular rounded-md w-5 h-5 transition-transform ${localFolderExpanded ? 'rotate-180deg ms-bezier' : ''}`} />
                        </div>
                    </div>
                    {localFolderExpanded && (
                        localFolders.map((folder, index) => (
                            <div key={folder} className='flex flex-row items-center gap-4'>
                                <span className='ml-9 grow-1 font-size-sm'>{folder}</span>
                                <Button iconOnly onClick={() => {
                                    handleDeleteFolder(index);
                                }} className='flex w-7.5 h-7.5 flex-row gap-2 items-center'>
                                    <span className='i-fluent:dismiss-20-regular w-5 h-5' />
                                </Button>
                            </div>
                        ))
                    )}
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Auto-scanning behavior</span>
                        <Select value={localAutoScan} options={autoScanOptions} position='left' onChange={(value) => {
                            setLocalAutoScan(value);
                        }} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Scan folders</span>
                        {!localScanned && <span className='font-size-sm color-text-sec'>Scanning...</span>}
                        <Button className='flex flex-row gap-2 items-center' onClick={localStorage.scan} disabled={!localScanned}>Start</Button>
                    </div>
                </Card>
                <span className='color-text-pri font-size-sm my-2'>WebDAV</span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:globe-24-regular w-5 h-5' />
                        <span className='grow-1'>Remote storages</span>
                        <Button className='flex flex-row gap-2 items-center'><span className='i-fluent:add-circle-20-regular w-5 h-5' />Add</Button>
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:database-arrow-down-20-regular w-5 h-5' />
                        <span className='grow-1'>Cache remote songs in local</span>
                        <Switch />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Auto-scanning behavior</span>
                        <Select value={localAutoScan} options={autoScanOptions} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Scan storages</span>
                        <Button className='flex flex-row gap-2 items-center'>Start</Button>
                    </div>
                </Card>
                <span className='color-text-pri font-size-sm my-2'>NetEase Cloud Music</span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:person-24-regular w-5 h-5' />
                        <span className='grow-1'>Account</span>
                        <Button className='flex flex-row gap-2 items-center'><span className='i-fluent:arrow-enter-20-regular w-5 h-5' />Sign In</Button>
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:window-20-regular w-5 h-5' />
                        <span className='grow-1'>API URL</span>
                        <Input value='http://localhost:3000' size={24} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Sync song lists</span>
                        <Switch />
                    </div>
                </Card>
            </div>
        </main>
    );
}
