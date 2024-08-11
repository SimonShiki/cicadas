import Button from './button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    size?: 'sm' | 'md';
    onPageChange: (page: number) => void;
    className?: string;
}

export default function Pagination ({ currentPage, totalPages, onPageChange, size = 'md', className = '' }: PaginationProps) {
    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(renderPageButton(i));
            }
        } else {
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                pageNumbers.push(renderPageButton(1));
                if (startPage > 2) {
                    pageNumbers.push(renderEllipsis('left'));
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(renderPageButton(i));
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pageNumbers.push(renderEllipsis('right'));
                }
                pageNumbers.push(renderPageButton(totalPages));
            }
        }

        return pageNumbers;
    };

    const renderPageButton = (pageNumber: number) => (
        <Button
            key={pageNumber}
            variant={pageNumber === currentPage ? 'primary' : 'secondary'}
            onClick={() => {
                if (pageNumber !== currentPage) {
                    onPageChange(pageNumber);
                }
            }}
            className={size === 'md' ? 'px-3 h-8' : 'px-2 h-6'}
            iconOnly
        >
            {pageNumber}
        </Button>
    );

    const renderEllipsis = (key: string) => (
        <span key={`ellipsis-${key}`} className="px-2">...</span>
    );

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`${size === 'md' ? 'w-8 h-8' : 'w-6 h-6'} group flex justify-center items-center`}
                iconOnly
            >
                <span className={`i-fluent:chevron-left-16-regular ${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} color-text-pri group-disabled:color-outline-sec dark:color-text-dark-pri dark:group-disabled:color-outline-dark-sec`} />
            </Button>

            {renderPageNumbers()}

            <Button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`${size === 'md' ? 'w-8 h-8' : 'w-6 h-6'} group flex justify-center items-center`}
                iconOnly
            >
                <span className={`i-fluent:chevron-right-16-regular ${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} color-text-pri group-disabled:color-outline-sec dark:color-text-dark-pri dark:group-disabled:color-outline-dark-sec`} />
            </Button>
        </div>
    );
}
