import { IFormattedAuditRecord } from 'models/auditRecord';
import { ColumnType } from 'antd/es/table';

export const auditColumns: ColumnType<IFormattedAuditRecord>[] = [
    {
        title: 'User ID',
        dataIndex: '_userid_value',
        key: '_userid_value',
    },
    {
        title: 'Created On',
        dataIndex: 'createdon',
        key: 'createdon',
    },
    {
        title: 'Operation',
        dataIndex: 'operation',
        key: 'operation',
    },
    {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
    },
    {
        title: 'Change Data',
        dataIndex: 'changedata',
        key: 'changedata',
    },
    {
        title: 'Record ID',
        dataIndex: '_objectid_value',
        key: '_objectid_value',
    },
];
