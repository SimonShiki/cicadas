import React from 'react';

interface TableProps {
    children: React.ReactNode;
    className?: string;
    striped?: boolean;
}

interface TableHeaderProps {
    children: React.ReactNode;
}

interface TableRowProps {
    children: React.ReactNode;
}

interface TableCellProps {
    children: React.ReactNode;
    className?: string;
}

const Table = ({ children, className = '', striped = false }: TableProps) => {
    return (
        <div className={`overflow-x-auto rounded-t-1.5 ${className}`}>
            <table className='w-full border-collapse'>
                {React.Children.map(children, (child, index) => {
                    if (React.isValidElement<TableRowProps & { isEven?: boolean; striped?: boolean }>(child) && child.type === Table.Row) {
                        return React.cloneElement(child, {
                            isEven: index % 2 === 0,
                            striped
                        });
                    }
                    return child;
                })}
            </table>
        </div>
    );
};

const TableHeader = ({ children }: TableHeaderProps) => {
    return (
        <thead>
            <tr className='bg-white dark:bg-black border-b-(1 solid outline-pri) dark:border-outline-dark-pri'>
                {children}
            </tr>
        </thead>
    );
};

const TableRow = ({ children, isEven, striped }: TableRowProps & { isEven?: boolean; striped?: boolean }) => {
    const stripedClass = striped && isEven ? 'bg-bg-sec dark:bg-bg-dark-sec' : '';
    return (
        <tr className={`border-b border-outline-pri dark:border-outline-dark-pri hover:bg-bg-sec dark:hover:bg-bg-dark-sec transition-colors ${stripedClass}`}>
            {children}
        </tr>
    );
};

const TableCell = ({ children, className = '' }: TableCellProps) => {
    return (
        <td className={`p-3 text-sm color-text-sec dark:color-text-dark-sec ${className}`}>
            {children}
        </td>
    );
};

Table.Header = TableHeader;
Table.Row = TableRow;
Table.Cell = TableCell;

export default Table;
