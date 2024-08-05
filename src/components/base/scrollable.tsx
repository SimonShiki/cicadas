import { useMount } from 'ahooks';
import React, { PropsWithChildren, useRef, useState } from 'react';
import Button from './button';

interface ScrollableProps extends PropsWithChildren {
    showButton?: boolean;
    className?: string;
}

const Scrollable: React.FC<ScrollableProps> = ({ children, showButton, className = '' }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);
    const [leftOpacity, setLeftOpacity] = useState(0);
    const [rightOpacity, setRightOpacity] = useState(100);

    useMount(() => {
        const checkScrollable = () => {
            if (scrollRef.current) {
                const { scrollWidth, clientWidth } = scrollRef.current;
                setIsScrollable(scrollWidth > clientWidth);
            }
        };

        checkScrollable();
        handleScroll();
        window.addEventListener('resize', checkScrollable);

        return () => {
            window.removeEventListener('resize', checkScrollable);
        };
    });

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setLeftOpacity(Math.min(100, scrollLeft * 0.05));
            setRightOpacity(Math.min(100, (scrollWidth - clientWidth - scrollLeft) * 0.05));
        }
    };

    return (
        <div className='relative'>
            {isScrollable && leftOpacity > 0 && (
                <>
                    <div className={'absolute z-2 left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-pri dark:from-bg-dark-pri to-transparent pointer-events-none transition-opacity'} style={{ opacity: leftOpacity }} />
                    {showButton && (
                        <div className='absolute z-3 left-2 top-50% bottom-50% flex items-center' style={{ opacity: leftOpacity }}>
                            <Button rounded iconOnly className='w-6 h-6 flex items-center justify-center' onClick={() => {
                                scrollRef.current!.scrollBy({
                                    left: -80,
                                    behavior: 'smooth'
                                });
                            }}>
                                <span className='w-3 h-3 i-ph:arrow-left-bold color-text-sec dark:color-text-dark-sec' />
                            </Button>
                        </div>
                    )}
                </>
            )}
            <div
                ref={scrollRef}
                className={`overflow-x-auto whitespace-nowrap ${showButton ? 'scrollbar-none' : 'sm:scrollbar scrollbar-rounded scrollbar-(thin thumb-color-outline-sec track-color-bg-pri) dark-scrollbar-(thumb-color-outline-dark-sec track-color-bg-dark-pri)'} ${className}`}
                onScroll={handleScroll}
            >
                {children}
            </div>
            {isScrollable && rightOpacity > 0 && (
                <>
                    <div className={'absolute z-2 right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-pri dark:from-bg-dark-pri to-transparent pointer-events-none transition-opacity'} style={{opacity: rightOpacity}} />
                    {showButton && (
                        <div className='absolute z-3 right-2 top-50% bottom-50% flex items-center' style={{ opacity: rightOpacity }}>
                            <Button rounded iconOnly className='w-6 h-6 flex items-center justify-center' onClick={() => {
                                scrollRef.current!.scrollBy({
                                    left: 80,
                                    behavior: 'smooth'
                                });
                            }}>
                                <span className='w-3 h-3 i-ph:arrow-right-bold color-text-sec dark:color-text-dark-sec' />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Scrollable;
