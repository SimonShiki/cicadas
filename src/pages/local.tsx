import { scanningJotai, Song } from '../jotais/storage';
import { useAtomValue } from 'jotai';
import local from '../storages/local';
import { useEffect, useState } from 'react';
import SongItem from '../components/song-item';
import Button from '../components/base/button';
import Select from '../components/base/select';
import Input from '../components/base/input';
import { Virtuoso } from 'react-virtuoso';

export default function Local () {
    const scanning = useAtomValue(scanningJotai);
    const [list, setList] = useState<Song<'local'>[]>([]);
    useEffect(() => {
        local.getSongList('add_asc').then((songs) => {
            setList(songs);
        });
    }, []);
    return (
        <div className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4 pl-2'>
                <div className='flex flex-row items-center'>
                    <span className='color-text-pri font-size-3xl font-500 grow-1'>Local</span>
                    <Button className='flex flex-row gap-2 items-center'><span className='i-fluent:folder-search-20-regular w-5 h-5' />Manage Folders</Button>
                </div>
                <div className='flex flex-row items-center gap-2'>
                    <Button variant='primary' className='flex flex-row gap-2 items-center'><span className='i-fluent:arrow-shuffle-20-regular w-5 h-5' />Random</Button>
                    <Input placeholder='Search' after={<span className='i-fluent:search-20-regular' />} className='m-l-auto' />
                    <span className='color-text-pri font-size-sm'>Sort By:</span>
                    <Select options={[{
                        value: 'a-z',
                        label: 'A - Z'
                    }]} value='a-z' />
                </div>
            </div>
            <div className='h-[calc(100vh-204px)]'>
                <Virtuoso
                    totalCount={list.length}
                    itemContent={(index) => {
                        const song = list[index];
                        return <SongItem song={song} hideBg={!(index % 2)} />;
                    }}
                />
            </div>
        </div>
    );
}
