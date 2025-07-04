import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    App,
    Switch,
    Spin
} from 'antd';
import { 
    PlayCircleOutlined, 
    DatabaseOutlined, 
    DownloadOutlined,
    SwapOutlined,
    CopyOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useQueryService } from '../api/queryService';
import { QueryType, IQueryResult, IQueryRequest, IODataResponse } from '../models';
import { parseEntityName, registerCompletionProviders } from '../utils/intellisense';
import { useMetadataService } from '../api/metadataService';
import { Resizable } from 'react-resizable';
import type { ResizeCallbackData } from 'react-resizable';
import { convertToCsv } from '../utils/export';
import { usePowerToolsApi } from '../powertools/apiHook';

const { Content } = Layout;
const { Title, Text } = Typography;

// Resizable Title Component for table columns
const ResizableTitle = (props: any) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
};

interface QueryBuilderProps {
    onEntitySelect?: (entityName: string) => void;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onEntitySelect }) => {
    const { message } = App.useApp();
    const [queryType, setQueryType] = useState<QueryType>('odata');
    const [query, setQuery] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [result, setResult] = useState<IQueryResult | null>(null);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [showEtagColumn, setShowEtagColumn] = useState(false);

    const { fetchEntityAttributes, getAllEntities } = useMetadataService();
    const { download, get } = usePowerToolsApi();
    const allEntitiesRef = React.useRef<any[]>([]);
    const previousEntityNameRef = React.useRef<string | null>(null);

    const resolveLogicalName = (name: string | null): string | null => {
        if (!name) return null;
        
        const match = allEntitiesRef.current.find(
            e =>
                e.LogicalName.toLowerCase() === name.toLowerCase() ||
                e.EntitySetName.toLowerCase() === name.toLowerCase()
        );
        return match ? match.LogicalName : name;
    };
    
    const queryService = useQueryService();
    const executeQueryRef = React.useRef<(() => void) | undefined>(undefined);
    const editorRef = React.useRef<any>(null);

    const handleExecuteQuery = useCallback(async () => {
        if (!query.trim()) {
            message.warning('Please enter a query to execute');
            return;
        }

        setLoading(true);
        setResult(null); // Clear previous results
        try {
            const request: IQueryRequest = {
                queryType,
                query: query.trim()
            };

            const initialResult = await queryService.executeQuery(request);
            setResult(initialResult);
            setLoading(false);

            if (initialResult.success && initialResult.nextLink) {
                setLoadingMore(true);
                let nextLink: string | undefined = initialResult.nextLink;
                let currentData = initialResult.data || [];

                while (nextLink) {
                    let newPage: IODataResponse<any>;
                    if (queryType === 'fetchxml') {
                        // For FetchXML, nextLink is the actual query
                        const request: IQueryRequest = {
                            queryType,
                            query: nextLink
                        };
                        const response = await queryService.executeQuery(request);
                        newPage = {
                            '@odata.context': '',
                            value: response.data || [],
                            '@odata.nextLink': response.nextLink
                        };
                    } else {
                        // For OData, nextLink is a URL
                        const url: URL = new URL(nextLink);
                        const path: string = url.pathname + url.search;
                        const proxyResponse = await get(path, undefined, { 'Prefer': 'odata.maxpagesize=5000' });
                        newPage = await proxyResponse.asJson();
                    }
                    
                    // Create a new array with the updated data
                    const updatedData = [...currentData, ...newPage.value];
                    
                    // Update state with the new data
                    setResult(prevResult => ({
                        ...prevResult!,
                        data: updatedData,
                        nextLink: newPage['@odata.nextLink'],
                        hasMore: !!newPage['@odata.nextLink']
                    }));

                    // Update local variables for next iteration
                    currentData = updatedData;
                    nextLink = newPage['@odata.nextLink'];
                }
                setLoadingMore(false);
            }

        } catch (error) {
            console.error('Error executing query:', error);
            message.error('Failed to execute query');
            setResult({
                success: false,
                error: 'An unexpected error occurred while executing the query'
            });
            setLoading(false);
            setLoadingMore(false);
        }
    }, [query, queryType, queryService, message, get]);
    
    useEffect(() => {
        executeQueryRef.current = handleExecuteQuery;
    }, [handleExecuteQuery]);

    const handleCopyQuery = () => {
        if (query) {
            try {
                // Create a temporary textarea element
                const textArea = document.createElement('textarea');
                textArea.value = query;
                
                // Make the textarea out of viewport
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                
                // Select and copy the text
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                
                // Clean up
                document.body.removeChild(textArea);
                
                if (successful) {
                    message.success('Query copied to clipboard');
                } else {
                    message.error('Failed to copy query');
                }
            } catch (err) {
                console.error('Failed to copy:', err);
                message.error('Failed to copy query');
            }
        }
    };

    const handleEditorMount = (_editor: any, monacoInstance: any) => {
        editorRef.current = _editor;
        // Register custom languages if not already registered
        const languages = monacoInstance.languages.getLanguages();
        
        if (!languages.some((lang: any) => lang.id === 'odata')) {
            monacoInstance.languages.register({ id: 'odata' });
        }
        
        // Register completion providers
        registerCompletionProviders(monacoInstance, async (name: string | null) => {
            const logical = resolveLogicalName(name);
            const attrs = logical ? await fetchEntityAttributes(logical) : [];
            return { attributes: attrs, entities: allEntitiesRef.current };
        });
        
        _editor.addAction({
            id: 'execute-query',
            label: 'Execute Query',
            keybindings: [
                monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
            ],
            run: () => executeQueryRef.current?.(),
        });

        _editor.addAction({
            id: 'copy-query',
            label: 'Copy Query',
            keybindings: [
                monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC,
            ],
            run: () => handleCopyQuery(),
        });
    };

    useEffect(() => {
        getAllEntities().then(list => {
            allEntitiesRef.current = list;
        });
    }, [getAllEntities]);

    // Sample queries for each type (memoized to prevent re-creation on every render)
    const sampleQueries = useMemo(() => ({
        odata: '/api/data/v9.2/accounts?$select=name,accountnumber,createdon&$top=10',
        fetchxml: `<fetch version="1.0" top="10" output-format="xml-platform" mapping="logical" distinct="false">
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
        sql: `SELECT TOP 10
    name,
    accountnumber,
    createdon
FROM account
WHERE statecode = 0`
    }), []);

    // Load sample query when query type changes
    useEffect(() => {
        setQuery(sampleQueries[queryType]);
        setResult(null);
    }, [queryType, sampleQueries]);

    useEffect(() => {
        // This effect is for pre-fetching entity attributes for intellisense
        const name = parseEntityName(query, queryType);
        const logical = resolveLogicalName(name);
        if (logical && logical !== previousEntityNameRef.current) {
            fetchEntityAttributes(logical);
            previousEntityNameRef.current = logical;
        }
    }, [query, queryType, fetchEntityAttributes]);

    // Handle query type change with automatic conversion
    const handleQueryTypeChange = (newQueryType: QueryType) => {
        if (newQueryType === queryType) return;

        // Load the sample query for the new type
        setQuery(sampleQueries[newQueryType]);
        setQueryType(newQueryType);
        setResult(null); // Clear previous results
    };

    const getEditorLanguage = (type: QueryType): string => {
        switch (type) {
            case 'odata':
                return 'odata';
            case 'fetchxml':
                return 'xml';
            case 'sql':
                return 'sql';
            default:
                return 'text';
        }
    };

    const handleExport = () => {
        if (result && result.success && result.data) {
            const csv = convertToCsv(result.data);
            download(csv, 'query-results.csv', 'text/csv');
        }
    };

    const renderQueryResults = () => {
        if (!result) return null;

        if (!result.success) {
            return (
                <Alert
                    message="Query Error"
                    description={
                        <div>
                            <p>{result.error}</p>
                            {result.errorDetails && (
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">Details:</Text>
                                    <div style={{ 
                                        marginTop: 4, 
                                        padding: 8, 
                                        background: '#f5f5f5', 
                                        borderRadius: 4,
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {result.errorDetails.type && (
                                            <div>Type: {result.errorDetails.type}</div>
                                        )}
                                        {result.errorDetails.requestId && (
                                            <div>Request ID: {result.errorDetails.requestId}</div>
                                        )}
                                        {result.errorDetails.time && (
                                            <div>Time: {new Date(result.errorDetails.time).toLocaleString()}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    }
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
        if (!firstRecord) {
            return (
                <Alert
                    message="Invalid Data Format"
                    description="The query returned data in an unexpected format."
                    type="error"
                    showIcon
                />
            );
        }
        
        let columnKeys = Object.keys(firstRecord);

        if (!showEtagColumn) {
            columnKeys = columnKeys.filter(key => key !== '@odata.etag');
        }

        const columns = columnKeys.map(key => {
            const defaultWidth = 150;
            const width = columnWidths[key] || defaultWidth;
            
            return {
                title: key,
                dataIndex: key,
                key: key,
                width: width,
                render: (value: any) => {
                    if (value === null || value === undefined) {
                        return <Text type="secondary">null</Text>;
                    }
                    if (typeof value === 'object') {
                        return <Text code>{JSON.stringify(value)}</Text>;
                    }
                    return String(value);
                },
                ellipsis: true,
                onHeaderCell: (column: any) => ({
                    width: width,
                    onResize: (e: any, { size }: ResizeCallbackData) => {
                        setColumnWidths(prev => ({
                            ...prev,
                            [key]: size.width
                        }));
                    },
                }),
            };
        });

        // Add row keys
        const dataWithKeys = result.data.map((record, index) => ({
            ...record,
            key: record.id || record.accountid || record.contactid || index
        }));

        return (
            <div>
                {result.warnings && result.warnings.length > 0 && (
                    <Alert
                        message="Execution Warnings"
                        description={
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {result.warnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                            </ul>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}
                
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                        <Statistic title="Records Returned" value={result.data.length} />
                    </Col>
                    <Col span={8}>
                        <Statistic title="Has More" value={result.hasMore ? 'Yes' : 'No'} />
                    </Col>
                    <Col span={8}>
                        <Statistic title="Columns" value={columns.length} />
                    </Col>
                </Row>
                
                <Table
                    columns={columns}
                    dataSource={dataWithKeys}
                    components={{
                        header: {
                            cell: ResizableTitle,
                        },
                    }}
                    pagination={{
                        pageSize: 25,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} records`
                    }}
                    scroll={{ x: true, y: 400 }}
                    size="small"
                    footer={() => (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                {result?.success && result.data && result.data[0]?.['@odata.etag'] && (
                                    <Space>
                                        <Switch size="small" checked={showEtagColumn} onChange={setShowEtagColumn} />
                                        <Text>Show ETag</Text>
                                    </Space>
                                )}
                            </div>
                            <div>
                                {loadingMore && (
                                    <Space>
                                        <Spin size="small" />
                                        <Text type="secondary">Loading more results...</Text>
                                    </Space>
                                )}
                            </div>
                        </div>
                    )}
                />
            </div>
        );
    };

    return (
        <Layout>
            <Content style={{ padding: '24px', minHeight: '100vh' }}>
                <Row gutter={16}>
                    <Col span={24}>
                        <Card
                            title={
                                <Space>
                                    <DatabaseOutlined />
                                    <Title level={4} style={{ margin: 0 }}>Query Builder</Title>
                                </Space>
                            }
                            extra={
                                <Space>
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
                                    <Button 
                                        type="primary" 
                                        onClick={handleExecuteQuery}
                                        loading={loading}
                                        icon={<PlayCircleOutlined />}
                                    >
                                        Execute Query
                                    </Button>
                                    <Button 
                                        icon={<CopyOutlined />}
                                        onClick={handleCopyQuery}
                                        disabled={!query}
                                    />
                                </Space>
                            }
                        >
                            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
                                <Editor
                                    height="300px"
                                    language={getEditorLanguage(queryType)}
                                    value={query}
                                    onChange={(value) => setQuery(value || '')}
                                    onMount={handleEditorMount}
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
                                <Space>
                                    {result?.success && result.data && (
                                        <Button icon={<DownloadOutlined />} onClick={handleExport}>
                                            Export Results
                                        </Button>
                                    )}
                                </Space>
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