import { ColumnType } from 'antd/lib/table';

import { IWorkflow } from '../models/workflows';

export const workflowsColumns: ColumnType<IWorkflow>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Category', dataIndex: 'category' },
  { title: 'Primary Entity', dataIndex: 'primaryentity' },
  { title: 'Status', dataIndex: 'statecode' },
  { title: 'Created On', dataIndex: 'createdon' },
];
