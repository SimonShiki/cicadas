import { PropsWithChildren, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function Portal ({ children }: PropsWithChildren) {
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setMountNode(document.body);
        return () => setMountNode(null);
    }, []);

    return mountNode ? createPortal(children, mountNode) : null;
}

export default Portal;
