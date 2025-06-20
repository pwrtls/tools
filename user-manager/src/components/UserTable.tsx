import { Table } from 'antd';
import { ISystemUser } from '../models/systemUser';
import { ColumnsType } from 'antd/es/table';
import { TableRowSelection } from 'antd/es/table/interface';
import { useEffect, useRef } from 'react';

interface UserTableProps {
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    users: ISystemUser[];
    columns: ColumnsType<ISystemUser>;
    rowSelection: TableRowSelection<ISystemUser>;
    onLoadMore: () => void;
}

export const UserTable = ({ 
    loading, 
    loadingMore, 
    hasMore, 
    users, 
    columns, 
    rowSelection, 
    onLoadMore 
}: UserTableProps) => {
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!tableRef.current || loadingMore || !hasMore) return;

            const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
            const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

            // Load more when user scrolls to 80% of the content
            if (scrollPercentage > 0.8) {
                onLoadMore();
            }
        };

        const tableElement = tableRef.current;
        if (tableElement) {
            tableElement.addEventListener('scroll', handleScroll);
            return () => tableElement.removeEventListener('scroll', handleScroll);
        }
    }, [loadingMore, hasMore, onLoadMore]);

    return (
        <div ref={tableRef} style={{ maxHeight: '600px', overflow: 'auto' }}>
            <Table
                loading={loading}
                rowSelection={rowSelection}
                columns={columns}
                dataSource={users}
                rowKey="systemuserid"
                pagination={false} // Disable pagination since we're using infinite scroll
                scroll={{ y: 600 }}
            />
            {loadingMore && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '16px',
                    color: '#666'
                }}>
                    Loading more users...
                </div>
            )}
            {!hasMore && users.length > 0 && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '16px',
                    color: '#666'
                }}>
                    No more users to load
                </div>
            )}
        </div>
    );
}; 