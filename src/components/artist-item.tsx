import { Artist } from '../jotais/library';

interface ArtistItemProps {
    artist: Artist;
    onClick (artist: Artist): void;
}

export default function ArtistItem({ artist, onClick }: ArtistItemProps) {
    return (
        <div className='flex flex-col gap-2 w-36 h-48 active:scale-95 border-(1 solid transparent) hover:border-outline-sec bg-black bg-op-0 hover:bg-op-5 rounded-lg p-1.5 transition-all' onClick={() => {
            onClick(artist);
        }}>
            <img draggable={false} src={artist.cover} alt={artist.name} className='w-36 h-36 aspect-square rounded-full border-(1 solid outline-sec)'/>
            <div className='flex flex-col *:text-ellipsis text-nowrap *:overflow-hidden max-w-30'>
                <span className='font-500'>{artist.name}</span>
                <span className='font-size-sm color-text-sec'>{artist.songs.length} Songs</span>
            </div>
        </div>
    );
}
