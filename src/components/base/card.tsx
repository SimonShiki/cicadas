import { forwardRef, MouseEventHandler, PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren {
    className?: string;
    onClick?: MouseEventHandler<HTMLDivElement>;
    onClickCapture?: MouseEventHandler<HTMLDivElement>;
    onContextMenu?: MouseEventHandler<HTMLDivElement>;
    onDoubleClick?: MouseEventHandler<HTMLDivElement>;
}

export default forwardRef<HTMLDivElement, CardProps>(function Card (props, ref) {
    return (
        <div
            className={`rounded-1.5 border-(1 solid outline-pri) dark:border-outline-dark-pri bg-white bg-op-60 dark:bg-bg-dark-pri p-4 ${props.onClick ? 'hover:border-outline-sec dark:hover:border-outline-dark-sec' : ''} ${props.className ?? ''}`}
            ref={ref}
            onClick={props.onClick}
            onClickCapture={props.onClickCapture}
            onDoubleClick={props.onDoubleClick}
            onContextMenu={props.onContextMenu}
        >
            {props.children}
        </div>
    );
});
