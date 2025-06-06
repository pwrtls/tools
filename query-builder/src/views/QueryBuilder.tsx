import React, { useState, useEffect, useMemo } from 'react';
import { 
    Layout, 
    Card, 
    Select, 
    Button, 
    Table, 
    Alert, 
    Space, 
    Typography,
    Row,
    Col,
    Statistic,
    message,
    Tooltip
} from 'antd';
import { 
    PlayCircleOutlined, 
    DatabaseOutlined, 
    BugOutlined, 
    DownloadOutlined,
    ClearOutlined,
    SwapOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useQueryService } from '../api/queryService';
import { QueryType, IQueryResult, IQueryRequest } from '../models';
import { QueryConverter } from '../utils/queryConverter';

const { Content } = Layout;
const { Title, Text } = Typography;

interface QueryBuilderProps {
    onEntitySelect?: (entityName: string) => void;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onEntitySelect }) => {
    const [queryType, setQueryType] = useState<QueryType>('odata');
    const [query, setQuery] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<IQueryResult | null>(null);
    const [conversionWarnings, setConversionWarnings] = useState<string[]>([]);
    
    const queryService = useQueryService();

    // Sample queries for each type (memoized to prevent re-creation on every render)
    const sampleQueries = useMemo(() => ({
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
        sql: 'SELECT name, accountnumber, createdon FROM account WHERE statecode = 0 ORDER BY name LIMIT 10'
    }), []);

    // Load sample query when query type changes (only if query is empty)
    useEffect(() => {
        if (!query.trim()) {
            setQuery(sampleQueries[queryType]);
            setConversionWarnings([]);
        }
    }, [queryType, query, sampleQueries]);

    // Handle query type change with automatic conversion
    const handleQueryTypeChange = (newQueryType: QueryType) => {
        if (newQueryType === queryType) return;

        // If there's a query to convert, attempt conversion
        if (query.trim()) {
            const conversionResult = QueryConverter.convert(query, queryType, newQueryType);
            
            if (conversionResult.success) {
                setQuery(conversionResult.query);
                setConversionWarnings(conversionResult.warnings || []);
                
                if (conversionResult.warnings && conversionResult.warnings.length > 0) {
                    message.info(`Query converted from ${queryType.toUpperCase()} to ${newQueryType.toUpperCase()}`);
                }
            } else {
                // If conversion fails, show error and load sample instead
                message.error(`Failed to convert query: ${conversionResult.error}`);
                setQuery(sampleQueries[newQueryType]);
                setConversionWarnings([]);
            }
        } else {
            // No query to convert, just load the sample
            setQuery(sampleQueries[newQueryType]);
            setConversionWarnings([]);
        }

        setQueryType(newQueryType);
        setResult(null); // Clear previous results
    };

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
        setConversionWarnings([]);
    };

    const handleLoadSample = () => {
        setQuery(sampleQueries[queryType]);
        setResult(null);
        setConversionWarnings([]);
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

                {conversionWarnings.length > 0 && (
                    <Alert
                        message="Query Converted"
                        description={
                            <div>
                                <p>Your query was automatically converted to {queryType.toUpperCase()} format:</p>
                                <ul>
                                    {conversionWarnings.map((warning, index) => (
                                        <li key={index}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        }
                        type="info"
                        showIcon
                        closable
                        onClose={() => setConversionWarnings([])}
                        style={{ marginTop: 16 }}
                    />
                )}

                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <Card
                            title="Query Editor"
                            extra={
                                <Space>
                                    <Tooltip title="Automatically converts queries between formats">
                                        <Select
                                            value={queryType}
                                            onChange={handleQueryTypeChange}
                                            style={{ width: 120 }}
                                            suffixIcon={<SwapOutlined />}
                                        >
                                            <Select.Option value="odata">OData</Select.Option>
                                            <Select.Option value="fetchxml">FetchXML</Select.Option>
                                            <Select.Option value="sql">SQL</Select.Option>
                                        </Select>
                                    </Tooltip>
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