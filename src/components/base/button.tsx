import { forwardRef, MouseEventHandler, PropsWithChildren } from 'react';

export interface ButtonProps extends PropsWithChildren {
    onClick?: MouseEventHandler<HTMLButtonElement>;
    variant?: 'primary' | 'secondary' | 'error'
    size?: 'sm' | 'md' | 'lg';
    rounded?: boolean;
    disabled?: boolean;
    iconOnly?: boolean;
    type?: 'submit';
    className?: string;
}

const gapMap = {
    sm: 'px-1 py-0.5',
    md: 'px-2 py-1.5',
    lg: 'p-3 py-2'
};

export default forwardRef<HTMLButtonElement, ButtonProps>(function Button ({
    onClick,
    variant = 'secondary',
    size = 'md',
    rounded,
    type,
    disabled,
    className,
    iconOnly,
    children
}, ref) {
    const variantClasses = {
        primary: 'bg-fg-pri color-white hover:bg-[#a36fae] hover:!border-[#a36fae] active:color-op-60 active:bg-[#a36fae] active:!border-[#a36fae] !border-fg-pri font-600 disabled:bg-[#99ceff] dark:disabled:bg-[#0a4380] disabled:!border-opacity-60 disabled:hover:bg-[#99ceff] dark:disabled:hover:!bg-[#0a4380] disabled:active:bg-[#99ceff] dark:disabled:active:bg-[#0a4380]',
        secondary: 'bg-white border-b-outline-sec active:border-b-outline-pri dark:active:border-b-outline-dark-pri dark:bg-bg-dark-sec color-text-pri dark:color-text-dark-pri hover:bg-bg-pri dark:hover:bg-bg-dark-sec border-outline-pri dark:border-outline-dark-sec active:bg-bg-sec dark:active:bg-bg-dark-sec disabled:hover:bg-white disabled:dark:hover:bg-black disabled:active:bg-white dark:disabled:active:bg-black',
        error: 'bg-red-500 color-white hover:bg-red-600 active:bg-red-900 !border-red-500 disabled:bg-red-300 dark:disabled:bg-[#832126] disabled:!border-red-300 dark:disabled:!border-[#832126] disabled:hover:bg-red-300 dark:disabled:hover:bg-[#832126] disabled:active:bg-red-300 dark:disabled:active:bg-[#832126]'
    };

    return (
        <button
            disabled={disabled}
            onClick={onClick}
            type={type}
            ref={ref}
            className={`font-inherit outline-none hover:cursor-pointer disabled:color-op-60 disabled:hover:cursor-not-allowed font-(400 size-sm) text-nowrap border-(1 solid) ${rounded ? 'rounded-full' : 'rounded-1.5'} transition-all ${variantClasses[variant]} ${iconOnly ? '' : gapMap[size]} ${className ?? ''}`}
        >
            {children}
        </button>
    );
});
