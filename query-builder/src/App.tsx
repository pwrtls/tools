import React, { useState } from 'react';
import { Layout, Input, Select, InputNumber, Checkbox, Button, Table, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { PowerToolsContextProvider } from './powertools/context';
import { usePowerToolsApi } from './powertools/apiHook';

const { Content } = Layout;
const { TextArea } = Input;

type QueryType = 'SQL' | 'OData' | 'FetchXML';

const AppContent: React.FC = () => {
  const api = usePowerToolsApi();
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('SQL');
  const [top, setTop] = useState<number | null>(null);
  const [countOnly, setCountOnly] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  function convertSqlToOData(sql: string): string {
    // Basic SQL to OData conversion
    const lowerSql = sql.toLowerCase();
    
    // Handle SELECT * FROM table
    if (lowerSql.includes('select * from')) {
      const tableName = lowerSql.split('from')[1].trim();
      return tableName;
    }
    
    // Handle SELECT field1, field2 FROM table
    if (lowerSql.includes('select') && lowerSql.includes('from')) {
      const [selectPart, fromPart] = lowerSql.split('from');
      const fields = selectPart.replace('select', '').trim();
      const tableName = fromPart.trim();
      
      if (fields === '*') {
        return tableName;
      }
      
      return `${tableName}?$select=${fields}`;
    }
    
    // If no conversion pattern matches, return the original query
    console.warn('No SQL to OData conversion pattern matched, using original query');
    return sql;
  }

  async function executeQuery() {
    if (!api.getAsJson) return;
    try {
      let result: any;
      if (queryType === 'SQL') {
        const odata = convertSqlToOData(query);
        console.log('Converted OData query:', odata);
        result = await api.getAsJson<any>(`/api/data/v9.0/${odata}`);
        console.log('API Response:', result);
      } else if (queryType === 'OData') {
        result = await api.getAsJson<any>(`/api/data/v9.0/${query}`);
        console.log('API Response:', result);
      } else {
        const params = new URLSearchParams();
        params.set('fetchXml', query);
        result = await api.getAsJson<any>('/api/data/v9.0/', params);
        console.log('API Response:', result);
      }

      console.log('Result value:', result?.value);
      const value = result?.value ?? [];
      console.log('Setting data to:', value);
      setData(value);
      if (value.length > 0) {
        const cols = Object.keys(value[0]).map(k => ({ title: k, dataIndex: k }));
        console.log('Setting columns to:', cols);
        setColumns(cols);
      } else {
        console.log('No data found, setting empty columns');
        setColumns([]);
      }
    } catch (e) {
      console.error('Error executing query', e);
    }
  }

  function toCsv(rows: any[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')];
    rows.forEach(r => {
      csv.push(headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
    });
    return csv.join('\n');
  }

  async function exportCsv() {
    if (!api.download) return;
    const csv = toCsv(data);
    await api.download(csv, 'results.csv', 'text/csv');
  }

  const pagination = { pageSize: 10 };

  return (
    <Content style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <TextArea rows={4} value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter query" />
        <Space wrap>
          <Select<QueryType> value={queryType} onChange={setQueryType} style={{ width: 120 }}>
            <Select.Option value="SQL">SQL</Select.Option>
            <Select.Option value="OData">OData</Select.Option>
            <Select.Option value="FetchXML">FetchXML</Select.Option>
          </Select>
          <InputNumber placeholder="Top N" value={top as number | undefined} onChange={value => setTop(value)} />
          <Checkbox checked={countOnly} onChange={e => setCountOnly(e.target.checked)}>Count Only</Checkbox>
          <Button type="primary" onClick={executeQuery}>Submit</Button>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
        </Space>
        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey={(record) => {
            // Try to use a unique identifier from the record, fallback to a generated key
            const keys = Object.keys(record);
            const idKey = keys.find(k => k.toLowerCase().includes('id'));
            return idKey ? record[idKey] : Math.random().toString(36).substr(2, 9);
          }}
          pagination={pagination} 
        />
      </Space>
    </Content>
  );
};

const App: React.FC = () => (
  <PowerToolsContextProvider showNoConnection>
    <AppContent />
  </PowerToolsContextProvider>
);

export default App;
