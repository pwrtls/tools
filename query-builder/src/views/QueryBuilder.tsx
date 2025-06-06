import React, { useState, useEffect, useCallback } from 'react';
import { 
    Layout, 
    Card, 
    Select, 
    Button, 
    Table, 
    Alert, 
    Spin, 
    Space, 
    Typography,
    Tabs,
    Row,
    Col,
    Statistic,
    message
} from 'antd';
import { 
    PlayCircleOutlined, 
    DatabaseOutlined, 
    BugOutlined, 
    DownloadOutlined,
    ClearOutlined 
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useQueryService } from '../api/queryService';
import { useMetadataService } from '../api/metadataService';
import { QueryType, IQueryResult, IQueryRequest } from '../models';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface QueryBuilderProps {
    onEntitySelect?: (entityName: string) => void;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onEntitySelect }) => {
    const [queryType, setQueryType] = useState<QueryType>('odata');
    const [query, setQuery] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<IQueryResult | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    
    const queryService = useQueryService();
    const metadataService = useMetadataService();

    // Sample queries for each type
    const sampleQueries = {
        odata: '/api/data/v9.2/accounts?$select=name,accountnumber,createdon&$top=10',
        fetchxml: `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
  <entity name="account">
    <attribute name="name" />
    <attribute name="accountnumber" />
    <attribute name="createdon" />
    <order attribute="name" descending="false" />
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
  </entity>
</fetch>`,
        sql: 'SELECT name, accountnumber, createdon FROM account WHERE statecode = 0 ORDER BY name'
    };

    // Load sample query when query type changes
    useEffect(() => {
        if (!query.trim()) {
            setQuery(sampleQueries[queryType]);
        }
    }, [queryType]);

    const handleExecuteQuery = async () => {
        if (!query.trim()) {
            message.warning('Please enter a query to execute');
            return;
        }

        setLoading(true);
        try {
            const request: IQueryRequest = {
                queryType,
                query: query.trim(),
                pageSize: 50
            };

            const queryResult = await queryService.executeQuery(request);
            setResult(queryResult);

            if (queryResult.success) {
                message.success(`Query executed successfully. Retrieved ${queryResult.data?.length || 0} records.`);
            } else {
                message.error(`Query failed: ${queryResult.error}`);
            }
        } catch (error) {
            console.error('Error executing query:', error);
            message.error('Failed to execute query');
            setResult({
                success: false,
                error: 'An unexpected error occurred while executing the query'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClearQuery = () => {
        setQuery('');
        setResult(null);
    };

    const handleLoadSample = () => {
        setQuery(sampleQueries[queryType]);
        setResult(null);
    };

    const getEditorLanguage = (type: QueryType): string => {
        switch (type) {
            case 'odata':
                return 'text';
            case 'fetchxml':
                return 'xml';
            case 'sql':
                return 'sql';
            default:
                return 'text';
        }
    };

    const renderQueryResults = () => {
        if (!result) return null;

        if (!result.success) {
            return (
                <Alert
                    message="Query Error"
                    description={result.error}
                    type="error"
                    showIcon
                />
            );
        }

        if (!result.data || result.data.length === 0) {
            return (
                <Alert
                    message="No Results"
                    description="The query executed successfully but returned no data."
                    type="info"
                    showIcon
                />
            );
        }

        // Generate columns from the first record
        const firstRecord = result.data[0];
        const columns = Object.keys(firstRecord).map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            render: (value: any) => {
                if (value === null || value === undefined) {
                    return <Text type="secondary">null</Text>;
                }
                if (typeof value === 'object') {
                    return <Text code>{JSON.stringify(value)}</Text>;
                }
                return String(value);
            },
            ellipsis: true
        }));

        // Add row keys
        const dataWithKeys = result.data.map((record, index) => ({
            ...record,
            key: record.id || record.accountid || record.contactid || index
        }));

        return (
            <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                        <Statistic title="Records Returned" value={result.data.length} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Total Count" value={result.totalCount || 'Unknown'} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Has More" value={result.hasMore ? 'Yes' : 'No'} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Columns" value={columns.length} />
                    </Col>
                </Row>
                
                <Table
                    columns={columns}
                    dataSource={dataWithKeys}
                    pagination={{
                        pageSize: 25,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} records`
                    }}
                    scroll={{ x: true, y: 400 }}
                    size="small"
                />
            </div>
        );
    };

    return (
        <Layout>
            <Content style={{ padding: '24px', minHeight: '100vh' }}>
                <Title level={2}>
                    <DatabaseOutlined /> Query Builder
                </Title>
                <Text type="secondary">
                    Build and execute queries against Dynamics 365 / Power Platform using OData, FetchXML, or SQL syntax.
                </Text>

                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <Card
                            title="Query Editor"
                            extra={
                                <Space>
                                    <Select
                                        value={queryType}
                                        onChange={setQueryType}
                                        style={{ width: 120 }}
                                    >
                                        <Select.Option value="odata">OData</Select.Option>
                                        <Select.Option value="fetchxml">FetchXML</Select.Option>
                                        <Select.Option value="sql">SQL</Select.Option>
                                    </Select>
                                    <Button onClick={handleLoadSample} icon={<BugOutlined />}>
                                        Load Sample
                                    </Button>
                                    <Button onClick={handleClearQuery} icon={<ClearOutlined />}>
                                        Clear
                                    </Button>
                                    <Button 
                                        type="primary" 
                                        onClick={handleExecuteQuery}
                                        loading={loading}
                                        icon={<PlayCircleOutlined />}
                                    >
                                        Execute Query
                                    </Button>
                                </Space>
                            }
                        >
                            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
                                <Editor
                                    height="300px"
                                    language={getEditorLanguage(queryType)}
                                    value={query}
                                    onChange={(value) => setQuery(value || '')}
                                    theme="vs-light"
                                    options={{
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        wordWrap: 'on',
                                        automaticLayout: true,
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        renderWhitespace: 'selection'
                                    }}
                                />
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <Card 
                            title="Query Results" 
                            loading={loading}
                            extra={
                                result?.success && result.data && (
                                    <Button icon={<DownloadOutlined />}>
                                        Export Results
                                    </Button>
                                )
                            }
                        >
                            {renderQueryResults()}
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}; 