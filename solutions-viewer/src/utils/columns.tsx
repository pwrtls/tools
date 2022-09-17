import moment from 'moment';
import { ColumnsType } from 'antd/lib/table';

import { ISolution } from 'models/solutions';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

import { SolutionComponentActionButton, ViewSolutionDetailsButton } from './buttons';
import { SolutionInfo } from './info';

export const solutionsColumns: ColumnsType<ISolution> = [
    {
        title: 'Friendly Name', dataIndex: 'friendlyname', key: 'friendlyName',// sorter: true, defaultSortOrder: 'ascend',
        render: (value, record) => <SolutionInfo friendlyName={value} isManaged={record.ismanaged} />,
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

export const getSolutionComponentColumns = (solutionId?: string) => {
    const solutionComponentColumns: ColumnsType<ISolutionComponentSummary> = [
        { title: 'Display Name', dataIndex: 'msdyn_displayname', key: 'displayName', ellipsis: true, render: (value?: string) => value || '-' },
        { title: 'Name', dataIndex: 'msdyn_name', key: 'name', ellipsis: true, render: (value?: string) => value || '-' },
        { title: 'Type', dataIndex: 'msdyn_componentlogicalname', key: 'type' },
        { title: 'Managed', dataIndex: 'msdyn_ismanaged', key: 'managed', render: (value: boolean) => value ? 'Yes' : 'No' },
        { title: 'Modified', dataIndex: 'msdyn_modifiedon', key: 'modified', render: (value?: string) => value ? moment(value).fromNow() : '-' },
        { title: 'Actions', key: 'actions', render: (v, record) => <SolutionComponentActionButton solutionId={solutionId} componentId={record.msdyn_objectid} componentType={record.msdyn_componenttype} /> },
    ];

    return solutionComponentColumns;
}


export const solutionHistoryColumns: ColumnsType<any> = [
    { title: 'Start', dataIndex: 'starttime', key: 'startTime', render: (value: string) => new Date(value).toLocaleString() },
    { title: 'End', dataIndex: 'endtime', key: 'endTime', render: (value: string) => new Date(value).toLocaleString() },
    { title: 'Version', dataIndex: 'solutionversion', key: 'version' },
    { title: 'Operation', key: 'operation', render: (v, record) => record['operation@OData.Community.Display.V1.FormattedValue'] || '-' },
    { title: 'Suboperation', key: 'suboperation', render: (v, record) => record['suboperation@OData.Community.Display.V1.FormattedValue']  || '-' },
    { title: 'Publisher', dataIndex: 'publishername', key: 'publishername' },
];
