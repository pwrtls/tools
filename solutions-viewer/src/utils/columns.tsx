import React from 'react';
import { Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';

import { ISolution } from 'models/solutions';
import { ViewSolutionDetailsButton } from './buttons';

export const solutionsColumns: ColumnsType<ISolution> = [
    {
        title: 'Friendly Name', dataIndex: 'friendlyname', key: 'friendlyName',// sorter: true, defaultSortOrder: 'ascend',
        render: (value, record, index) => {
            return (
                <React.Fragment>
                    <Typography.Text>{ value }</Typography.Text> <Tag color={record.ismanaged ? 'warning' : 'processing'}>{ record.ismanaged ? 'Managed' : 'Unmanaged' }</Tag>
                </React.Fragment>
            );
        },
    },
    {
        title: 'Unique Name', dataIndex: 'uniquename', key: 'uniqueName',// ellipsis: true, sorter: true
    },
    {
        title: 'Version', dataIndex: 'version', key: 'version',
    },
    {
        title: 'Modified On', dataIndex: 'modifiedon', key: 'modifiedOn',// sorter: true,
        render: (modified: string) => new Date(modified).toLocaleDateString(),
    },
    {
        title: 'View Details', key: 'detailsBtn',
        render: (_, record) => <ViewSolutionDetailsButton solutionId={record.solutionid} />,
    },
];
