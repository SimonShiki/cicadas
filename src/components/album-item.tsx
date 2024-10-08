import { FormattedMessage } from 'react-intl';
import { Album } from '../jotais/library';

interface AlbumItemProps {
    album: Album;
    onClick (album: Album): void;
}

export default function AlbumItem ({album, onClick}: AlbumItemProps) {
    return (
        <div className='flex flex-col gap-2 w-36 h-48 active:scale-95 border-(1 solid transparent) hover:border-outline-sec dark:hover:border-outline-dark-sec bg-black dark:bg-[#2f3338] dark:bg-op-0 bg-op-0 hover:bg-op-5 dark:hover:bg-op-25 rounded-lg p-1.5 transition-all' onClick={() => {
            onClick(album);
        }}>
            <img draggable={false} src={album.cover} alt={album.name} className='w-36 h-36 aspect-square rounded-md border-(1 solid outline-sec) dark:border-outline-dark-sec'/>
            <div className='flex flex-col *:text-ellipsis text-nowrap *:overflow-hidden max-w-30'>
                <span className='font-500'>{album.name}</span>
                <span className='font-size-sm color-text-sec dark:color-text-dark-sec'>
                    <FormattedMessage defaultMessage='{total} Songs' values={{ total: album.songs.length }} />
                </span>
            </div>
        </div>
    );
}
