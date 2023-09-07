import moment from 'moment';
import { ColumnsType } from 'antd/lib/table';

import { ISolution } from 'models/solutions';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

import { SolutionComponentActionButton, ViewSolutionDetailsButton } from './buttons';
import { SolutionInfo } from './info';

import { Button } from 'antd';
import { SolutionPicker } from '../views/SolutionsView';


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
    }/*,
    {
        title: 'View Details', key: 'detailsBtn',
        render: (_, record) => <ViewSolutionDetailsButton solutionId={record.solutionid} />,
    }*/,
];

const endpoint = '/api/data/v9.2/';
const customHeaders = {
    "Content-Type": "application/json"
  };
  

export const getSolutionComponentColumns = (solutionId?: string) => {
    const solutionComponentColumns: ColumnsType<ISolutionComponentSummary> = [
        { title: 'Display Name', dataIndex: 'msdyn_displayname', key: 'displayName', ellipsis: true, render: (value?: string) => value || '-' },
        { title: 'Name', dataIndex: 'msdyn_name', key: 'name', ellipsis: true, render: (value?: string) => value || '-' },
        { title: 'Type', dataIndex: 'msdyn_componentlogicalname', key: 'type' },
        { title: 'Type Value', dataIndex: 'msdyn_componenttype', key: 'description' },
        { title: 'Managed', dataIndex: 'msdyn_ismanaged', key: 'managed', render: (value: boolean) => value ? 'Yes' : 'No' },
        { title: 'Customizable', dataIndex: 'msdyn_iscustomizable', key: 'customize', render: (value: boolean) => value ? 'Yes' : 'No' },
        { title: 'Modified', dataIndex: 'msdyn_modifiedon', key: 'modified', render: (value?: string) => value ? moment(value).fromNow() : '-' },
        {
            title: 'Actions', key: 'actions',
            render: (v, record) =>
                <SolutionComponentActionButton
                    solutionId={solutionId}
                    component={record}
                />,
        }/*,
        {
            title: 'Move To', key: 'moveto',
            render: (v, record) =>
            <Button type="primary" onClick= { () => componentAPI(endpoint + 'AddSolutionComponent', 'POST', new URLSearchParams, customHeaders, new Object({
                "ComponentId":record.msdyn_objectid,
                "ComponentType":record.msdyn_componenttype.toString(),
                "SolutionUniqueName":prompt("Please provide the Unique Name of the target solution for this component.") ?? '',
                "AddRequiredComponents":'false'
              }))
            }>
            Move To
          </Button>,
        },
        {
            title: 'Delete', key: 'delete',
            render: (v, record) =>
            <Button type="primary" onClick= { () =>
                componentAPI(endpoint + 'solutions?$select=uniquename&$filter=solutionid eq ' + record.msdyn_solutionid, 'GET').then(
                    function success(result) {
                        console.log(result)
                        var data = JSON.parse(result.content)
                        componentAPI(endpoint + 'RemoveSolutionComponent', 'POST', new URLSearchParams, customHeaders, {
                            "ComponentId":'{' + record.msdyn_objectid + '}',
                            "ComponentType":record.msdyn_componenttype.toString(),
                            "SolutionUniqueName": 'test'//data.value[0].uniquename
                          })
                      })
            }>
            Delete
          </Button>,
        },*/
    ]; //The above is awaiting 

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