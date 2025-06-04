import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, Input, Select, InputNumber, Checkbox, Button, Table, Space, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { PowerToolsContextProvider } from './powertools/context';
import { usePowerToolsApi } from './powertools/apiHook';
import { QueryIntellisense } from './components/QueryIntellisense';
import { MetadataService } from './services/metadataService';

const { Content } = Layout;

type QueryType = 'SQL' | 'OData' | 'FetchXML';

const AppContent: React.FC = () => {
  const api = usePowerToolsApi();
  
  // Create metadata service instance - use a ref to maintain stable instance
  const metadataServiceRef = useRef<MetadataService | null>(null);
  const [metadataServiceReady, setMetadataServiceReady] = useState(false);
  
  // Initialize metadata service once when API becomes available
  const initializeMetadataService = useCallback(() => {
    if (api.getAsJson && !metadataServiceRef.current) {
      metadataServiceRef.current = new MetadataService(api.getAsJson);
      console.log('App: MetadataService created and stored in ref');
      setMetadataServiceReady(true); // Trigger re-render
      
      // Start loading metadata immediately in the background
      metadataServiceRef.current.getMetadata().then(() => {
        console.log('App: Background metadata loading completed');
      }).catch((error) => {
        console.error('App: Background metadata loading failed:', error);
      });
    }
  }, [api.getAsJson]);
  
  useEffect(() => {
    initializeMetadataService();
  }, [initializeMetadataService]);
  
  const metadataService = metadataServiceRef.current;
  
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('SQL');
  const [top, setTop] = useState<number | null>(null);
  const [countOnly, setCountOnly] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  function convertSqlToOData(sql: string): { endpoint: string; error?: string } {
    // Basic SQL to OData conversion
    const lowerSql = sql.toLowerCase().trim();
    
    try {
      // Handle SELECT * FROM table
      if (lowerSql.includes('select * from')) {
        const tableName = lowerSql.split('from')[1].trim().split(/\s+/)[0]; // Get first word after FROM
        console.log('Extracted table name from SQL:', tableName);
        
        // Try to find the entity in metadata
        if (metadataService) {
          const collectionName = metadataService.getEntityCollectionName(tableName);
          if (collectionName) {
            console.log('Found entity:', tableName, 'with collection name:', collectionName);
            return { endpoint: collectionName };
          } else {
            console.warn('Entity not found in metadata:', tableName);
            return { endpoint: tableName, error: `Entity '${tableName}' not found in metadata. Available entities will be logged.` };
          }
        } else {
          return { endpoint: tableName + 's', error: 'Metadata service not available, using best guess' };
        }
      }
      
      // Handle SELECT field1, field2 FROM table
      if (lowerSql.includes('select') && lowerSql.includes('from')) {
        const [selectPart, fromPart] = lowerSql.split('from');
        let fields = selectPart.replace('select', '').trim();
        const tableName = fromPart.trim().split(/\s+/)[0]; // Get first word after FROM
        
        // Try to find the entity in metadata
        let entitySetName = tableName;
        if (metadataService) {
          const collectionName = metadataService.getEntityCollectionName(tableName);
          if (collectionName) {
            entitySetName = collectionName;
          } else {
            entitySetName = tableName + 's'; // Fallback
          }
        }
        
        if (fields === '*') {
          return { endpoint: entitySetName };
        }
        
        // Clean up field names
        fields = fields.split(',').map(f => f.trim()).join(',');
        return { endpoint: `${entitySetName}?$select=${fields}` };
      }
      
      // If no conversion pattern matches, return the original query
      console.warn('No SQL to OData conversion pattern matched, using original query');
      return { endpoint: sql, error: 'Could not parse SQL query' };
      
    } catch (error) {
      console.error('Error converting SQL to OData:', error);
      return { endpoint: sql, error: `Conversion error: ${error}` };
    }
  }

  async function executeQuery() {
    if (!api.getAsJson) return;
    try {
      let result: any;
      if (queryType === 'SQL') {
        const conversion = convertSqlToOData(query);
        console.log('Converted OData query:', conversion.endpoint);
        if (conversion.error) {
          console.warn('Conversion warning:', conversion.error);
          
          // Log available entities to help debugging
          if (metadataService) {
            const entities = metadataService.searchEntities('').slice(0, 20);
            console.log('Available entities (first 20):', entities.map(e => ({
              LogicalName: e.LogicalName,
              EntitySetName: e.EntitySetName
            })));
          }
        }
        result = await api.getAsJson<any>(`/api/data/v9.0/${conversion.endpoint}`);
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

      // Handle PowerTools API response format
      let data: any;
      if (result && typeof result.content === 'string') {
        // PowerTools API returns response with content as JSON string
        const parsedContent = JSON.parse(result.content);
        
        // Check if the parsed content is an error
        if (parsedContent.error) {
          console.error('API Error Response:', parsedContent.error);
          alert(`API Error: ${parsedContent.error.message} (${parsedContent.error.code})`);
          return;
        }
        
        data = parsedContent;
      } else {
        // Direct JSON response
        data = result;
      }

      console.log('Parsed data:', data);
      const value = data?.value ?? [];
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
      alert(`Query execution failed: ${e}`);
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
        {metadataServiceReady ? (
          <QueryIntellisense
            value={query}
            onChange={setQuery}
            metadataService={metadataService!}
            placeholder="SELECT * FROM account or SELECT name, email FROM contact ↵ Use Tab/Enter for autocomplete"
            rows={4}
          />
        ) : (
          <div style={{ position: 'relative' }}>
            <Input.TextArea
              rows={4}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="⏳ Initializing query builder, please wait..."
              disabled={true}
              style={{ 
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5',
                cursor: 'not-allowed'
              }}
            />
            <div style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Spin size="small" />
              <span style={{ fontSize: '12px', color: '#666' }}>Initializing...</span>
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              marginTop: '4px'
            }}>
              ⏳ Setting up query builder with intellisense...
            </div>
          </div>
        )}
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
