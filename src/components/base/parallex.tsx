import { useMount } from 'ahooks';
import React, { PropsWithChildren, useState, useRef } from 'react';

interface ParallaxProps extends PropsWithChildren {
    speed?: number;
    className?: string;
}

export default function Parallax ({
    children,
    speed = 0.5,
    className = ''
}: ParallaxProps) {
    const [scrollY, setScrollY] = useState(0);
    const [initialTop, setInitialTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useMount(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setInitialTop(rect.top + window.scrollY);
        }

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    });

    const parallaxStyle = {
        transform: `translateY(${(scrollY - initialTop) * speed}px)`
    };

    return (
        <div className={`overflow-hidden h-fit`} ref={containerRef}>
            <div className={className} style={parallaxStyle}>
                {children}
            </div>
        </div>
    );
}
