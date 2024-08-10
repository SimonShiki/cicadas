import defaultCover from '../assets/default-cover.png';
import Card from './base/card';

interface SonglistItemProps {
    id: string | number;
    index?: number;
    name: string;
    cover?: string;
    onClick? (id: string | number, index?: number): void;
    hideBg?: boolean;
}

export default function SonglistItem (props: SonglistItemProps) {

    return (
        <Card onDoubleClick={() => {
            props.onClick?.(props.id, props.index);
        }} className={`flex flex-row items-center py-2 gap-2 hover:!bg-black cursor-pointer hover:!bg-op-5 transition-colors ${props.hideBg ? '!border-none !bg-transparent' : ''}`}>
            <img draggable={false} src={props.cover ?? defaultCover} alt={props.name} className='rounded-md w-10 h-10' />
            <span className='color-text-pri font-size-sm font-500'>{props.name}</span>
        </Card>
    );
}
