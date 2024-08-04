import React, { forwardRef, useState, useEffect } from 'react';

interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
    label?: string;
}

const sizeMap = {
    sm: 'w-8 h-4',
    md: 'w-10 h-5',
    lg: 'w-12 h-6'
};

const thumbSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch ({
    checked = false,
    onChange,
    disabled = false,
    size = 'md',
    color = 'bg-fg-pri',
    className = '',
    label
}, ref) {
    const [isChecked, setIsChecked] = useState(checked);

    useEffect(() => {
        setIsChecked(checked);
    }, [checked]);

    const handleToggle = () => {
        if (!disabled) {
            const newChecked = !isChecked;
            setIsChecked(newChecked);
            onChange?.(newChecked);
        }
    };

    return (
        <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={handleToggle}
                    disabled={disabled}
                    ref={ref}
                />
                <div
                    className={`${sizeMap[size]} ${isChecked ? color : 'bg-bg-sec dark:bg-bg-dark-sec'} rounded-full shadow-inner transition-colors duration-300 ease-in-out`}
                />
                <div
                    className={`${thumbSizeMap[size]} absolute top-0.5 left-1 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out ${isChecked ? `translate-x-full` : 'translate-x-0'
                    }`}
                />
            </div>
            {label && <span className="ml-3 text-sm color-text-pri dark:color-text-dark-pri">{label}</span>}
        </label>
    );
});

export default Switch;
