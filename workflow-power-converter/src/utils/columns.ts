import { ColumnType } from 'antd/lib/table';

import { IWorkflow } from '../models/workflows';

export const workflowsColumns: ColumnType<IWorkflow>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Category', dataIndex: 'category' },
  { title: 'Primary Entity', dataIndex: 'primaryEntity' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Created On', dataIndex: 'createdOn', render: (date) => date.toLocaleDateString() },
];
