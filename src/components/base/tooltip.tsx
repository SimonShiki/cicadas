import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    content: React.ReactNode;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
    trigger?: 'hover' | 'click';
    children: React.ReactNode;
    className?: string;
}

export default function Tooltip ({ content, placement = 'top', trigger = 'hover', children, className = '' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false);
            }
        };

        if (trigger === 'click') {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            if (trigger === 'click') {
                document.removeEventListener('mousedown', handleClickOutside);
            }
        };
    }, [trigger]);

    const handleTrigger = () => {
        if (trigger === 'click') {
            setIsVisible(!isVisible);
        }
    };

    const getTooltipClasses = () => {
        const baseClasses = 'absolute z-2000 p-2 shadow-lg bg-white dark:bg-black border-(1 solid outline-pri) dark:border-outline-dark-pri rounded-1.5 text-text-pri dark:text-text-dark-pri text-sm transition-all duration-150';
        let positionClasses = '';
        const visibilityClasses = isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none';
        let animationClasses = '';

        switch (placement) {
        case 'top':
        case 'top-center':
            positionClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-3';
            animationClasses = isVisible ? 'translate-y-0' : 'translate-y-2';
            break;
        case 'top-left':
            positionClasses = 'bottom-full left-0 mb-3';
            animationClasses = isVisible ? 'translate-y-0' : 'translate-y-2';
            break;
        case 'top-right':
            positionClasses = 'bottom-full right-0 mb-3';
            animationClasses = isVisible ? 'translate-y-0' : 'translate-y-2';
            break;
        case 'bottom':
        case 'bottom-center':
            positionClasses = 'top-full left-1/2 -translate-x-1/2 mt-3';
            animationClasses = isVisible ? 'translate-y-0' : '-translate-y-2';
            break;
        case 'bottom-left':
            positionClasses = 'top-full left-0 mt-3';
            animationClasses = isVisible ? 'translate-y-0' : '-translate-y-2';
            break;
        case 'bottom-right':
            positionClasses = 'top-full right-0 mt-3';
            animationClasses = isVisible ? 'translate-y-0' : '-translate-y-2';
            break;
        case 'left':
            positionClasses = 'right-full top-1/2 -translate-y-1/2 mr-3';
            animationClasses = isVisible ? 'translate-x-0' : 'translate-x-2';
            break;
        case 'right':
            positionClasses = 'left-full top-1/2 -translate-y-1/2 ml-3';
            animationClasses = isVisible ? 'translate-x-0' : '-translate-x-2';
            break;
        }

        return `${baseClasses} ${positionClasses} ${visibilityClasses} ${animationClasses}`;
    };

    const getIndicatorClasses = () => {
        const baseClasses = 'absolute w-0 h-0 border-solid border-transparent z-2000';
        let positionClasses = '';

        switch (placement) {
        case 'top':
        case 'top-center':
            positionClasses = 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-white dark:border-t-black border-l-[6px] border-r-[6px] border-t-[6px]';
            break;
        case 'top-left':
            positionClasses = 'bottom-[-6px] left-[10px] border-t-white dark:border-t-black border-l-[6px] border-r-[6px] border-t-[6px]';
            break;
        case 'top-right':
            positionClasses = 'bottom-[-6px] right-[10px] border-t-white dark:border-t-black border-l-[6px] border-r-[6px] border-t-[6px]';
            break;
        case 'bottom':
        case 'bottom-center':
            positionClasses = 'top-[-6px] left-1/2 -translate-x-1/2 border-b-white dark:border-b-black border-l-[6px] border-r-[6px] border-b-[6px]';
            break;
        case 'bottom-left':
            positionClasses = 'top-[-6px] left-[10px] border-b-white dark:border-b-black border-l-[6px] border-r-[6px] border-b-[6px]';
            break;
        case 'bottom-right':
            positionClasses = 'top-[-6px] right-[10px] border-b-white dark:border-b-black border-l-[6px] border-r-[6px] border-b-[6px]';
            break;
        case 'left':
            positionClasses = 'right-[-6px] top-1/2 -translate-y-1/2 border-l-white dark:border-l-black border-t-[6px] border-b-[6px] border-l-[6px]';
            break;
        case 'right':
            positionClasses = 'left-[-6px] top-1/2 -translate-y-1/2 border-r-white dark:border-r-black border-t-[6px] border-b-[6px] border-r-[6px]';
            break;
        }

        return `${baseClasses} ${positionClasses}`;
    };

    return (
        <div className="relative inline-block" ref={tooltipRef}>
            <div
                onMouseEnter={() => trigger === 'hover' && setIsVisible(true)}
                onMouseLeave={() => trigger === 'hover' && setIsVisible(false)}
                onClick={handleTrigger}
                className={className}
            >
                {children}
            </div>
            <div className={getTooltipClasses()}>
                {content}
                <div className={getIndicatorClasses()}></div>
            </div>
        </div>
    );
}
