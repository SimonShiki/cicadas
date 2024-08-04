interface LoadingDotsProps {
    size?: number;
    variant?: 'primary' | 'secondary';
    className?: string;
    dotClassName?: string;
}

export default function LoadingDots ({
    size = 4,
    variant = 'secondary',
    className = '',
    dotClassName = ''
}: LoadingDotsProps) {
    return (
        <span style={{gap: size * 0.75}} className={`flex items-center ${className}`}>
            <span style={{ width: size, height: size }} className={`animate-pulse animate-ease animate-duration-1400 ${variant === 'primary' ? 'bg-bg-pri' : 'bg-text-sec'} rounded-full ${dotClassName}`} />
            <span style={{ width: size, height: size }} className={`animate-pulse animate-ease animate-duration-1400 animate-delay-200 ${variant === 'primary' ? 'bg-bg-pri' : 'bg-text-sec'} rounded-full ${dotClassName}`} />
            <span style={{ width: size, height: size }} className={`animate-pulse animate-ease animate-duration-1400 animate-delay-400 ${variant === 'primary' ? 'bg-bg-pri' : 'bg-text-sec'} rounded-full ${dotClassName}`} />
        </span>
    );
}
