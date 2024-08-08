import React, { forwardRef, useState, useEffect, useRef, useCallback, Ref } from 'react';

interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    onChange?: (value: number) => void;
    onChangeEnd?: (value: number) => void;
    disabled?: boolean;
    className?: string;
    vertical?: boolean;
}

const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider ({
    min = 0,
    max = 100,
    step = 1,
    value: propValue,
    onChange,
    onChangeEnd,
    disabled = false,
    className = '',
    vertical = false,
}, ref) {
    const [value, setValue] = useState(propValue ?? min);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (propValue !== undefined && !isDragging) {
            setValue(propValue);
        }
    }, [propValue, isDragging]);

    const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

    const getValueFromPosition = useCallback((position: number) => {
        if (!sliderRef.current) return min;
        const sliderRect = sliderRef.current.getBoundingClientRect();
        const percentage = vertical
            ? 1 - (position - sliderRect.top) / sliderRect.height
            : (position - sliderRect.left) / sliderRect.width;
        const rawValue = percentage * (max - min) + min;
        const steppedValue = Math.round(rawValue / step) * step;
        return clamp(steppedValue, min, max);
    }, [min, max, step, vertical]);

    const handleMove = useCallback((clientX: number, clientY: number) => {
        const newValue = getValueFromPosition(vertical ? clientY : clientX);
        setValue(newValue);
        onChange?.(newValue);
    }, [getValueFromPosition, onChange, vertical]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return;
        setIsDragging(true);
        handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            onChangeEnd?.(value);
        }
    }, [isDragging, onChangeEnd, value]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            handleMove(e.clientX, e.clientY);
        }
    }, [handleMove, isDragging]);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const getPercentage = () => ((value - min) / (max - min)) * 100;

    const sliderStyles = vertical
        ? 'h-full w-6'
        : 'w-full h-6';

    const trackStyles = vertical
        ? 'h-full w-1 left-1/2 -translate-x-1/2'
        : 'w-full h-1 top-1/2 -translate-y-1/2';

    const fillStyles = vertical
        ? 'w-full bottom-0 left-0'
        : 'h-full top-0 left-0';

    const thumbStyles = vertical
        ? 'left-1/2 -translate-x-1/2'
        : 'top-1/2 -translate-y-1/2';

    return (
        <div
            className={`relative ${sliderStyles} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            ref={mergeRefs(sliderRef, ref)}
            onMouseDown={handleMouseDown}
        >
            <div className={`absolute ${trackStyles} bg-outline-sec dark:bg-bg-dark-sec rounded-full`}>
                <div
                    className={`absolute ${fillStyles} bg-fg-pri duration-500 dark:bg-fg-dark-pri ${isDragging ? 'transition-duration-0 transition-none' : 'transition-all ms-bezier'} rounded-full`}
                    style={vertical ? { height: `${getPercentage()}%` } : { width: `${getPercentage()}%` }}
                ></div>
            </div>
            <div
                ref={thumbRef}
                className={`group absolute ${thumbStyles} w-4 h-4 rounded-full bg-white border-(1 solid outline-pri) border-b-(solid outline-sec) dark:border-fg-dark-pri flex items-center justify-center ${disabled ? '' : 'hover:scale-110'
                } ${isDragging ? 'transition-duration-0 transition-none' : 'transition-all ms-bezier'} duration-500`}
                style={vertical
                    ? {
                        bottom: `${getPercentage()}%`,
                        transform: `translate(-50%, 50%) ${isDragging ? 'scale(1.1)' : ''}`,
                    }
                    : {
                        left: `${getPercentage()}%`,
                        transform: `translate(-50%, -50%) ${isDragging ? 'scale(1.1)' : ''}`,
                    }
                }
            >
                <div className={`w-2.4 h-2.4 ${isDragging ? '!w-2 !h-2' : ''} group-hover:w-3 group-hover:h-3 transition-all transition-ease-out rounded-full bg-fg-pri`} />
            </div>
        </div>
    );
});

const mergeRefs = function <T> (...refs: (Ref<T> | null)[]): ((node: T) => void) {
    return (node: T) => {
        refs.forEach((ref) => {
            if (typeof ref === 'function') {
                ref(node);
            } else if (ref !== null) {
                (ref as React.MutableRefObject<T | null>).current = node;
            }
        });
    };
};

export default Slider;
