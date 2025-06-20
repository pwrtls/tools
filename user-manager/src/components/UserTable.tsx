import { Table } from 'antd';
import { ISystemUser } from '../models/systemUser';
import { ColumnsType } from 'antd/es/table';
import { TableRowSelection } from 'antd/es/table/interface';

interface UserTableProps {
    loading: boolean;
    users: ISystemUser[];
    columns: ColumnsType<ISystemUser>;
    rowSelection: TableRowSelection<ISystemUser>;
}

export const UserTable = ({ loading, users, columns, rowSelection }: UserTableProps) => {
    return (
        <Table
            loading={loading}
            rowSelection={rowSelection}
            columns={columns}
            dataSource={users}
            rowKey="systemuserid"
        />
    );
}; 