import Button from '../components/base/button';
import Card from '../components/base/card';
import Input from '../components/base/input';
import Select from '../components/base/select';
import Switch from '../components/base/switch';

const autoScanOptions = [
    {value: 'startup', label: 'Each startup'},
    {value: 'daily', label: 'Daily'},
    {value: 'weekly', label: 'Weekly'},
    {value: 'never', label: 'Never'}
];

export default function Settings () {
    return (
        <main className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2 pl-2'>
                <span className='color-text-pri font-size-3xl font-500 grow-1'>Settings</span>
                <span className='color-text-pri font-size-sm my-2'>Local</span>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:folder-24-regular w-5 h-5' />
                        <span className='grow-1'>Folders to scan</span>
                        <Button className='flex flex-row gap-2 items-center'><span className='i-fluent:folder-add-20-regular w-5 h-5' />Add Folders</Button>
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Auto-scanning behavior</span>
                        <Select value='startup' options={autoScanOptions} />
                    </div>
                </Card>
                <Card className='flex flex-col gap-2 color-text-pri'>
                    <div className='flex flex-row items-center gap-4'>
                        <span className='i-fluent:arrow-sync-20-filled w-5 h-5' />
                        <span className='grow-1'>Scan folders</span>
                        <Button className='flex flex-row gap-2 items-center'>Start</Button>
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
                        <Select value='startup' options={autoScanOptions} />
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
