import React, { forwardRef, ChangeEvent } from 'react';

interface RadioProps {
    label?: string;
    name: string;
    value: string;
    checked?: boolean;
    onChange?: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio ({
    label,
    name,
    value,
    checked = false,
    onChange,
    disabled = false,
    className = '',
}, ref) {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    };

    return (
        <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className='relative'>
                <input
                    type='radio'
                    name={name}
                    value={value}
                    className='sr-only'
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    ref={ref}
                />
                <div className={`w-5 h-5 rounded-full border-(2 solid) transition-all duration-200 ease-in-out
                        ${checked
            ? 'border-fg-pri dark:border-fg-dark-pri'
            : 'border-outline-pri dark:border-outline-dark-pri'}
                        ${disabled
            ? 'border-outline-ter dark:border-outline-dark-ter'
            : 'hover:border-fg-pri dark:hover:border-fg-dark-pri'}`}>
                    <div className={`absolute inset-0 m-1 rounded-full transition-all duration-200 ease-in-out
                          ${checked
            ? 'bg-fg-pri dark:bg-fg-dark-pri scale-100'
            : 'bg-transparent scale-0'}`}>
                    </div>
                </div>
            </div>
            {label && (
                <span className='ml-2 text-sm font-medium color-text-pri dark:color-text-dark-pri'>{label}</span>
            )}
        </label>
    );
});

export default Radio;
