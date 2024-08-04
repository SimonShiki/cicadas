import { PropsWithChildren, useEffect, useState } from "react";
import Portal from "./portal";
import { miSans, notoSans } from "@/utils/fonts";

interface ModalProps extends PropsWithChildren {
    open: boolean;
    uncancellable?: boolean;
    parentClassName?: string;
    className?: string;
    openClassName?: string;
    closeClassName?: string;
    onClose?: () => void;
}

export default function Modal (props: ModalProps) {
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 640);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return (
        <Portal>
            <div
                onClick={() => {
                    if (props.uncancellable) return;
                    props.onClose?.();
                }}
                className={`${notoSans.className} ${miSans.className} fixed inset-0 w-full h-full transition-colors duration-300 ${props.open ? 'z-700 bg-black bg-opacity-50 visible' : 'invisible pointer-events-none bg-transparent'
                } ${props.parentClassName ?? ''}`}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`z-701 bg-white dark:bg-bg-dark-pri border-(1 solid outline-pri) dark:border-outline-dark-pri max-h-80vh overflow-auto transition-all duration-300 ease-in-out
                        ${isSmallScreen
            ? `fixed bottom-0 left-0 right-0 transform ${props.open ? 'translate-y-0' : 'translate-y-full'} rounded-t-1.5`
            : `fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${props.open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} rounded-1.5 w-fit`
        }
                        px-4 py-6 ${props.className ?? ''} ${props.open ? props.openClassName ?? '' : props.closeClassName ?? ''}`
                    }
                >
                    {props.children}
                </div>
            </div>
        </Portal>
    );
}
