import { focusAtom } from 'jotai-optics';
import Button from '../components/base/button';
import Card from '../components/base/card';
import Input from '../components/base/input';
import Select from '../components/base/select';
import Switch from '../components/base/switch';
import { localeJotai, settingsJotai, storagesConfigJotai } from '../jotais/settings';
import { SetStateAction, useAtom, useAtomValue, useSetAtom, WritableAtom } from 'jotai';
import type { LocalConfig } from '../storages/local';
import { useCallback, useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { storagesJotai } from '../jotais/storage';
import Tooltip from '../components/base/tooltip';
import Modal from '../components/base/modal';
import md5 from 'md5';
import { NCMConfig } from '../storages/ncm';
import Spinner from '../components/base/spinner';
import { FormattedMessage, useIntl } from 'react-intl';
import { langMap } from '../../locales';

const streamingJotai = focusAtom(settingsJotai, (optic) => optic.prop('streaming'));
const localStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('local')) as unknown as WritableAtom<LocalConfig, [SetStateAction<LocalConfig>], void>;
const ncmStorageConfigJotai = focusAtom(storagesConfigJotai, (optic) => optic.prop('ncm')) as unknown as WritableAtom<NCMConfig, [SetStateAction<NCMConfig>], void>;
const ncmCookieJotai = focusAtom(ncmStorageConfigJotai, (optic) => optic.prop('cookie'));
const ncmLoggedInJotai = focusAtom(ncmStorageConfigJotai, (optic) => optic.prop('loggedIn'));
const ncmApiJotai = focusAtom(ncmStorageConfigJotai, (optic) => optic.prop('api'));
const ncmProfileJotai = focusAtom(ncmStorageConfigJotai, (optic) => optic.prop('profile'));
const localFoldersJotai = focusAtom(localStorageConfigJotai, (optic) => optic.prop('folders'));
const localAutoScanJotai = focusAtom(localStorageConfigJotai, (optic) => optic.prop('autoScanBehavior'));
const localStorageJotai = focusAtom(storagesJotai, (optic) => optic.prop('local'));
const localScannedJotai = focusAtom(localStorageJotai, (optic) => optic.prop('scanned'));

export default function Settings () {
    const [locale, setLocale] = useAtom(localeJotai);
    const [localFolders, setLocalFolders] = useAtom(localFoldersJotai);
    const [localAutoScan, setLocalAutoScan] = useAtom(localAutoScanJotai);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [localFolderExpanded, setLocalFolderExpanded] = useState(false);
    const [ncmAuthModalOpen, setNcmAuthModalOpen] = useState(false);
    const [qr, setQr] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const {instance: localStorage} = useAtomValue(localStorageJotai);
    const ncmConfig = useAtomValue(ncmStorageConfigJotai);
    const localScanned = useAtomValue(localScannedJotai);
    const setNCMCookie = useSetAtom(ncmCookieJotai);
    const [ncmLoggedIn, setNCMloggedIn] = useAtom(ncmLoggedInJotai);
    const [streaming, setStreaming] = useAtom(streamingJotai);
    const [ncmProfile, setNCMProfile] = useAtom(ncmProfileJotai);
    const [ncmAPI, setNcmAPI] = useAtom(ncmApiJotai);
    const intl = useIntl();

    const autoScanOptions = [
        { value: 'startup', label: intl.formatMessage({ defaultMessage: 'Each startup'}) } as const,
        { value: 'daily', label: intl.formatMessage({ defaultMessage: 'Daily'}) } as const,
        { value: 'weekly', label: intl.formatMessage({ defaultMessage: 'Weekly'}) } as const,
        { value: 'never', label: intl.formatMessage({ defaultMessage: 'Never'}) } as const
    ];

    useEffect(() => {
        if (!qr) {
            setQrUrl('');
            return;
        }
        async function qrLogin () {
            const keyRes = await fetch(`${ncmConfig.api}login/qr/key`);
            const {data: keyData} = await keyRes.json();
            const imgRes = await fetch(`${ncmConfig.api}login/qr/create?key=${keyData.unikey}&qrimg=1&t=${Date.now()}`);
            const {data: imageData} = await imgRes.json();
            setQrUrl(imageData.qrimg);
            console.log(imageData);
            const intervalId = setInterval(async () => {
                if (!qr) clearInterval(intervalId);
                const checkRes = await fetch(`${ncmConfig.api}login/qr/check?key=${keyData.unikey}&qrimg=1&t=${Date.now()}`);
                const checkData = await checkRes.json();
                switch (checkData.code) {
                // expired
                case 800: {
                    const keyRes = await fetch(`${ncmConfig.api}login/qr/key`);
                    const { data: keyData } = await keyRes.json();
                    const imgRes = await fetch(`${ncmConfig.api}login/qr/create?key=${keyData.unikey}&t=${Date.now()}`);
                    const { data: imageData } = await imgRes.json();
                    setQrUrl(imageData.qrimg);
                    break;
                }
                case 801:
                    console.log('pending');
                    break;
                case 802:
                    console.log('confirming');
                    break;
                case 803:
                    setNCMCookie(checkData.cookie);
                    setNCMloggedIn(true);
                    setNcmAuthModalOpen(false);
                    clearInterval(intervalId);
                    break;
                }
            }, 1000);
        }
        qrLogin();
    }, [qr]);

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

    const handleSignin: React.FormEventHandler<HTMLFormElement> = useCallback(async (e) => {
        e.preventDefault();
        const res = await fetch(`${ncmConfig.api}login/cellphone?phone=${phone}&md5_password=${encodeURIComponent(md5(password))}`);
        const json = await res.json();
        console.log(json);
        if (json.code === 200) {
            setNCMCookie(json.cookie);
            setNCMloggedIn(true);
            setNcmAuthModalOpen(false);
        }
    }, [phone, password]);

    return (
        <main className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2 pl-2'>
                <span className='color-text-pri font-size-3xl font-500 grow-1'>
                    <FormattedMessage defaultMessage='Settings' />
                </span>
                <span className='color-text-pri font-size-sm my-2'>
                    <FormattedMessage defaultMessage='Language' />
                </span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:local-language-zi-24-regular w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Language' />
                        </span>
                        <Select value={locale} options={langMap} position='left' onChange={(value) => setLocale(value)} />
                    </div>
                </Card>
                <span className='color-text-pri font-size-sm my-2'>
                    <FormattedMessage defaultMessage='Play' />
                </span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:stream-24-regular w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Use streaming (Experimental)' />
                        </span>
                        <Tooltip content={intl.formatMessage({ defaultMessage: 'Streaming does not currently support adjusting playback progress'})} placement='left' tooltipClassName='min-w-50'>
                            <Switch checked={streaming} onChange={setStreaming} />
                        </Tooltip>
                    </div>
                </Card>
                <span className='color-text-pri font-size-sm my-2'>
                    <FormattedMessage defaultMessage='Local' />
                </span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:folder-24-regular w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Folders to scan' />
                        </span>
                        <Button className='flex flex-row gap-2 items-center' onClick={handleAddNewFolder}>
                            <span className='i-fluent:folder-add-20-regular w-5 h-5' />
                            <FormattedMessage defaultMessage='Add Folders' />
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
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Auto-scanning behavior' />
                        </span>
                        <Select value={localAutoScan} options={autoScanOptions} position='left' onChange={(value) => {
                            setLocalAutoScan(value);
                        }} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Scan folders' />
                        </span>
                        {!localScanned && <span className='font-size-sm color-text-sec'>
                            <FormattedMessage defaultMessage='Scanning...' />
                        </span>}
                        <Button className='flex flex-row gap-2 items-center' onClick={localStorage.scan} disabled={!localScanned}>
                            <FormattedMessage defaultMessage='Start' />
                        </Button>
                    </div>
                </Card>
                <span className='color-text-pri font-size-sm my-2'>
                    <FormattedMessage defaultMessage='WebDAV' />
                </span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:globe-24-regular w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Remote storages' />
                        </span>
                        <Button className='flex flex-row gap-2 items-center'><span className='i-fluent:add-circle-20-regular w-5 h-5' />
                            <FormattedMessage defaultMessage='Add' />
                        </Button>
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:database-arrow-down-20-regular w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Cache remote songs in local' />
                        </span>
                        <Switch />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Auto-scanning behavior' />
                        </span>
                        <Select value={localAutoScan} options={autoScanOptions} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Scan storages' />
                        </span>
                        <Button className='flex flex-row gap-2 items-center'>
                            <FormattedMessage defaultMessage='Start' />
                        </Button>
                    </div>
                </Card>
                <span className='color-text-pri font-size-sm my-2'>
                    <FormattedMessage defaultMessage='NetEase Cloud Music' />
                </span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:person-24-regular w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='163 Account' />
                        </span>
                        {ncmProfile && (
                            <div className='flex items-center gap-2'>
                                <img src={ncmProfile.avatarUrl} draggable={false} className="w-6 h-6 aspect-square rounded-full" />
                                <span className='font-size-sm'>{ncmProfile.nickname}</span>
                            </div>
                        )}
                        <Button onClick={() => {
                            if (ncmLoggedIn) {
                                setNCMCookie(undefined);
                                setNCMProfile(undefined);
                                setNCMloggedIn(false);
                            } else {
                                setNcmAuthModalOpen(true);
                            }
                        }} className='flex flex-row gap-2 items-center'>{ncmLoggedIn ? (
                                <>
                                    <span className='i-fluent:arrow-exit-20-regular w-5 h-5' />
                                    <span>
                                        <FormattedMessage defaultMessage='Sign Out' />
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className='i-fluent:arrow-enter-20-regular w-5 h-5' />
                                    <span>
                                        <FormattedMessage defaultMessage='Sign In' />
                                    </span>
                                </>
                                
                            )}</Button>
                        <Modal open={ncmAuthModalOpen} onClose={() => {
                            setNcmAuthModalOpen(false);
                        }} className='flex flex-col gap-4'>
                            <span className='font-(size-xl 500)'>
                                <FormattedMessage defaultMessage='Sign In' />
                            </span>
                            <div className='flex items-center gap-6'>
                                {qr ? (
                                    <div>
                                        {qrUrl ? (
                                            <img src={qrUrl} className='w-60 aspect-square' />
                                        ) : <div className='w-60 h-60 flex justify-center items-center'><Spinner /></div>
                                        }
                                    </div>
                                ) : (
                                    <>
                                        <span className='i-fluent:person-lock-24-regular w-16 h-16' /><form className='flex flex-col gap-2' onSubmit={handleSignin}>
                                            <Input placeholder='Phone' value={phone} onChange={(e) => {
                                                setPhone(e.target.value);
                                            } } type='tel' size={28} />
                                            <Input placeholder='Password' value={password} onChange={(e) => {
                                                setPassword(e.target.value);
                                            } } type='password' size={28} />
                                            <div className='flex mt-2 gap-2 items-center'>
                                                <span onClick={() => {
                                                    setQr(true);
                                                } } className='color-fg-pri grow-1 font-size-sm cursor-pointer'>
                                                    <FormattedMessage defaultMessage='Use QRCode' />
                                                </span>
                                                <Button size='lg' onClick={() => {
                                                    setNcmAuthModalOpen(false);
                                                } }>
                                                    <FormattedMessage defaultMessage='Cancel' />
                                                </Button>
                                                <Button variant='primary' size='lg'>
                                                    <FormattedMessage defaultMessage='Sign In' />
                                                </Button>
                                            </div>
                                        </form>
                                    </>    
                                )}
                            </div>
                        </Modal>
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:window-20-regular w-5 h-5' />
                        <span className='grow-1'>API URL</span>
                        <Input value={ncmAPI} size={32} onChange={(e) => {
                            setNcmAPI(e.target.value);
                        }} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>
                            <FormattedMessage defaultMessage='Sync song lists' />
                        </span>
                        <Switch />
                    </div>
                </Card>
            </div>
        </main>
    );
}
