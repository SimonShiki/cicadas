import React, { useEffect, useState } from 'react';

interface ProgressProps {
    value: number;
    max?: number;
    className?: string;
    color?: string;
    height?: string;
    animated?: boolean;
}

const Progress: React.FC<ProgressProps> = ({
    value,
    max = 100,
    className = '',
    color = 'bg-fg-pri',
    height = 'h-1',
    animated = true,
}) => {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const percentage = (value / max) * 100;
        setWidth(percentage);
    }, [value, max]);

    return (
        <div className={`w-full ${height} bg-bg-sec dark:bg-bg-dark-sec rounded-full overflow-hidden ${className}`}>
            <div
                className={`h-full ${color} rounded-full ${animated ? 'transition-all duration-500 ease-out' : ''}`}
                style={{ width: `${width}%` }}
            >
                <div className={`h-full ${animated ? 'animate-pulse' : ''}`} />
            </div>
        </div>
    );
};

export default Progress;
