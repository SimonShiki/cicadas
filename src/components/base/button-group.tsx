import React, { Children, cloneElement, isValidElement } from 'react';
import Button, { ButtonProps } from './button';

interface ButtonGroupProps {
    children: React.ReactNode;
    vertical?: boolean;
    className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, vertical = false, className = '' }) => {
    const groupClass = vertical
        ? 'flex flex-col'
        : 'flex flex-row';

    const modifiedChildren = Children.map(children, (child, index) => {
        if (isValidElement<ButtonProps>(child) && child.type === Button) {
            let modifiedClassName = child.props.className || '';

            if (vertical) {
                modifiedClassName += index === 0 ? ' rounded-b-none' : index === Children.count(children) - 1 ? ' rounded-t-none' : ' rounded-none';
                modifiedClassName += index !== Children.count(children) - 1 ? ' border-b-0' : '';
            } else {
                modifiedClassName += index === 0 ? ' rounded-r-none' : index === Children.count(children) - 1 ? ' rounded-l-none' : ' rounded-none';
                modifiedClassName += index !== 0 ? ' border-l-0' : '';
            }

            return cloneElement(child, { className: modifiedClassName });
        }
        return child;
    });

    return (
        <div className={`inline-flex ${groupClass} ${className}`}>
            {modifiedChildren}
        </div>
    );
};

export default ButtonGroup;
