import { PropsWithChildren } from 'react';

interface BadgeProps extends PropsWithChildren {
    variant: 'primary' | 'secondary';
    className?: string;
}

export default function Badge (props: BadgeProps) {
    return (
        <span className={`p-2 text-nowrap rounded-full font-size-sm ${props.variant === 'primary' ? 'bg-fg-pri color-white' : 'bg-bg-sec border-outline-sec color-text-pri'} ${props.className ?? ''}`}>{props.children}</span>
    );
}
