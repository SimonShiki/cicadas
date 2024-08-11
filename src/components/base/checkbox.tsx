import React, { forwardRef, ChangeEvent } from 'react';

interface CheckboxProps {
    label?: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox ({
    label,
    checked = false,
    onChange,
    disabled = false,
    className = '',
}, ref) {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.checked);
    };

    return (
        <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className='relative'>
                <input
                    type='checkbox'
                    className='sr-only'
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    ref={ref}
                />
                <div className={`w-4 h-4 flex items-center justify-center border-(1 solid) rounded transition-all duration-150 ease-in-out
                        ${checked
            ? 'bg-fg-pri border-fg-pri dark:bg-fg-dark-pri dark:border-fg-dark-pri'
            : 'bg-white border-outline-pri dark:bg-bg-dark-pri dark:border-outline-dark-pri'}
                        ${disabled
            ? 'border-outline-ter dark:border-outline-dark-ter'
            : 'hover:border-fg-pri dark:hover:border-fg-dark-pri'}`}>
                    <svg
                        className={`w-2 h-2 text-white dark:text-bg-dark-pri fill-current transition-opacity duration-200 ease-in-out
                        ${checked ? 'opacity-100' : 'opacity-0'}`}
                        viewBox='0 0 20 20'
                    >
                        <path d='M0 11l2-2 5 5L18 3l2 2L7 18z' />
                    </svg>
                </div>
            </div>
            {label && (
                <span className='ml-2 text-sm color-text-pri dark:color-text-dark-pri'>{label}</span>
            )}
        </label>
    );
});

export default Checkbox;
