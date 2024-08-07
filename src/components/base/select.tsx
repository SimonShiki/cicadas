import React, { useState, useRef, forwardRef } from 'react';
import Dropdown from './dropdown';

interface SelectOption<T> {
    value: T;
    label: string;
}

interface SelectProps<T> {
    options: SelectOption<T>[];
    value?: T;
    onChange?: (value: T) => void;
    placeholder?: string;
    position?: 'left' | 'right';
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
    sm: 'text-sm py-0.5 px-1',
    md: 'text-base py-1 px-1.5',
    lg: 'text-lg py-1.5 px-2',
};

function Select<T> ({
    options,
    value,
    onChange,
    placeholder,
    disabled,
    position,
    className = '',
    size = 'md',
}: SelectProps<T>, ref: React.Ref<HTMLDivElement>) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.value === value);

    const handleSelect = (option: SelectOption<T>) => {
        onChange?.(option.value);
        setIsOpen(false);
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div ref={ref} className={`relative ${className} select-none`}>
            <Dropdown
                open={isOpen}
                onClose={() => setIsOpen(false)}
                position={position}
                content={
                    <div className="p-1 text-nowrap">
                        {options.map((option) => (
                            <div
                                key={String(option.value)}
                                className={`px-4 py-2 cursor-pointer rounded-md font-size-sm hover:bg-bg-pri dark:hover:bg-bg-dark-sec ${option.value === value ? 'bg-bg-pri dark:bg-bg-dark-sec' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                }
                className="w-full"
                contentClassName="bg-white dark:bg-bg-dark-pri border border-outline-pri dark:border-outline-dark-pri rounded-1.5 shadow-lg"
            >
                <div
                    ref={selectRef}
                    className={`flex items-center justify-between cursor-pointer
          ${sizeMap[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          border-(1 solid transparent) dark:border-outline-dark-pri
          rounded-1.5 dark:bg-black font-size-sm font-400
          hover:border-outline-pri hover:bg-white
          transition-all
          ${isOpen ? '!border-outline-pri' : ''}
        `}
                    onClick={toggleDropdown}
                >
                    <span className={`${!selectedOption ? 'text--400' : 'color-fg-pri'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        className={`w-3 h-3 ml-2 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </Dropdown>
        </div>
    );
}

export default forwardRef(Select) as <T>(
    props: SelectProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;
