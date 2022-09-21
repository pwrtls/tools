import React from 'react';
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';

import { IPluginTraceLog } from 'models/pluginTraceLog';

interface IPluginTraceProps {
    traces: IPluginTraceLog[];
    loading: boolean;
    searching: boolean;
}

export const PluginTraceTable: React.FC<IPluginTraceProps> = (props) => {
    const columns: ColumnsType<IPluginTraceLog> = [
        {
            title: 'Operation Type', dataIndex: 'operationtype@OData.Community.Display.V1.FormattedValue', key: 'operationType',
        },
        {
            title: 'Type Name', dataIndex: 'typename', key: 'typeName', ellipsis: true,
        },
        {
            title: 'Message Name', dataIndex: 'messagename', key: 'messageName',
        },
        {
            title: 'Start Time', dataIndex: 'performanceexecutionstarttime', key: 'startTime', render: (value: string) => new Date(value).toLocaleString(),
        },
        {
            title: 'Message', dataIndex: 'messageblock', key: 'messageBlock', ellipsis: true,
        },
        {
            title: 'Exception', dataIndex: 'exceptiondetails', key: 'exceptionDetails', ellipsis: true,
        },
    ];

    return (
        <Table<IPluginTraceLog>
            dataSource={props.traces}
            columns={columns}
            loading={props.loading || props.searching}
            rowKey="plugintracelogid"
            pagination={false}
        />
    );
}
