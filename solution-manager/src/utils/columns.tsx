import moment from 'moment';
import { ColumnsType } from 'antd/lib/table';

import { ISolution } from 'models/solutions';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

import { SolutionComponentActionButton } from './buttons';
import { SolutionInfo } from './info';

import { useMemo } from 'react';

export const useSolutionsColumns = (onViewClick: (solutionId: string) => void): ColumnsType<ISolution> => {
    return useMemo(() => [
        {
            title: 'Friendly Name', dataIndex: 'friendlyname', key: 'friendlyName',
            render: (value, record) => (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onViewClick(record.solutionid); }}
                    style={{ background: 'none', border: 'none', color: '#1890ff', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                    aria-label={`View details for ${value}`}
                >
                    <SolutionInfo friendlyName={value} isManaged={record.ismanaged} />
                </button>
            ),
        },
        {
            title: 'Unique Name', dataIndex: 'uniquename', key: 'uniqueName',
        },
        {
            title: 'Version', dataIndex: 'version', key: 'version',
        },
        {
            title: 'Modified On', dataIndex: 'modifiedon', key: 'modifiedOn',
            render: (modified: string) => new Date(modified).toLocaleDateString(),
        }/*,
        {
            title: 'View Details', key: 'detailsBtn',
            render: (_, record) => <ViewSolutionDetailsButton solutionId={record.solutionid} />,
        }*/,
    ], [onViewClick]);
};

export const useSolutionComponentColumns = (solutionId?: string) => {
    return useMemo(() => [
        { title: 'Display Name', dataIndex: 'msdyn_displayname', key: 'displayName', ellipsis: true, render: (value?: string) => value || '-' },
        { title: 'Name', dataIndex: 'msdyn_name', key: 'name', ellipsis: true, render: (value?: string) => value || '-' },
        { title: 'Type', dataIndex: 'msdyn_componentlogicalname', key: 'type' },
        { title: 'Type Value', dataIndex: 'msdyn_componenttype', key: 'description' },
        { title: 'Managed', dataIndex: 'msdyn_ismanaged', key: 'managed', render: (value: boolean) => value ? 'Yes' : 'No' },
        { title: 'Customizable', dataIndex: 'msdyn_iscustomizable', key: 'customize', render: (value: boolean) => value ? 'Yes' : 'No' },
        { title: 'Modified', dataIndex: 'msdyn_modifiedon', key: 'modified', render: (value?: string) => value ? moment(value).fromNow() : '-' },
        {
            title: 'Actions', key: 'actions',
            render: (_: unknown, record: ISolutionComponentSummary) =>
                <SolutionComponentActionButton
                    solutionId={solutionId}
                    component={record}
                />,
        }
    ], [solutionId]);
}

export const solutionHistoryColumns: ColumnsType<any> = [
    { title: 'Start', dataIndex: 'starttime', key: 'startTime', render: (value: string) => new Date(value).toLocaleString() },
    { title: 'End', dataIndex: 'endtime', key: 'endTime', render: (value: string) => new Date(value).toLocaleString() },
    { title: 'Version', dataIndex: 'solutionversion', key: 'version' },
    { title: 'Operation', key: 'operation', render: (v, record) => record['operation@OData.Community.Display.V1.FormattedValue'] || '-' },
    { title: 'Suboperation', key: 'suboperation', render: (v, record) => record['suboperation@OData.Community.Display.V1.FormattedValue'] || '-' },
    { title: 'Publisher', dataIndex: 'publishername', key: 'publishername' },
];

// Remove this function if it's not used elsewhere
// export const useColumns = () => {
//     const { get, post } = usePowerToolsApi();
    
//     return useMemo(() => [
//         // ... existing code ...
//     ], []);
// }