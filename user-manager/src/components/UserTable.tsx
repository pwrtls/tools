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
    const tableContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tableBody = tableContainerRef.current?.querySelector('.ant-table-body');
        if (!tableBody) return;

        const handleScroll = () => {
            if (loadingMore || !hasMore) {
                return;
            }

            const { scrollTop, scrollHeight, clientHeight } = tableBody;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            // Load more when user is near the bottom of the scroll area
            if (distanceFromBottom < 200) {
                onLoadMore();
            }
        };

        tableBody.addEventListener('scroll', handleScroll);
        return () => tableBody.removeEventListener('scroll', handleScroll);
        
    }, [loadingMore, hasMore, onLoadMore, users]); // Re-attach listener if users change

    return (
        <div ref={tableContainerRef}>
            <Table
                loading={loading}
                rowSelection={rowSelection}
                columns={columns}
                dataSource={users}
                rowKey="systemuserid"
                pagination={false}
                scroll={{ y: 600, x: 'max-content' }}
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