import React, { PropsWithChildren, useEffect, useRef } from 'react';

interface DropdownProps extends PropsWithChildren {
    open: boolean;
    onClose: () => void;
    content: React.ReactNode;
    className?: string;
    contentClassName?: string;
    position?: 'left' | 'right';
}

export default function Dropdown ({
    open,
    onClose,
    children,
    content,
    className = '',
    contentClassName = '',
    position = 'right'
}: DropdownProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside (event: MouseEvent) {
            if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, onClose]);

    return (
        <div className={`relative inline-block text-left ${className}`}>
            {children}
            {open && (
                <div
                    ref={contentRef}
                    className={`absolute animate-menu ms-bezier animate-duration-150 border-(1 solid outline-pri) dark:border-outline-dark-pri z-800 ${position === 'left' ? 'right-0' : 'left-0'} origin-top-right shadow-lg ${contentClassName}`}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
