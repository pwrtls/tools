import React, { useState, useEffect } from 'react';
import { 
    Layout, Card, Table, Typography, Breadcrumb, 
    Input, Badge, Spin, Alert, Tag, Pagination, Space
} from 'antd';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';

import { useMetadataService } from 'api/metadataService';
import { IOptionSetMetadata, IOptionMetadata } from 'models/entityMetadata';
import Navigation from 'components/Navigation';

const { Content, Header } = Layout;
const { Title } = Typography;

const OptionSetListView: React.FC = () => {
    const metadataService = useMetadataService();
    
    // State
    const [optionSets, setOptionSets] = useState<IOptionSetMetadata[]>([]);
    const [filteredOptionSets, setFilteredOptionSets] = useState<IOptionSetMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    
    // Load option sets from the API
    useEffect(() => {
        const loadOptionSets = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await metadataService.getGlobalOptionSets(pageSize, currentPage);
                setOptionSets(response.value);
                setFilteredOptionSets(response.value);
                setTotalCount(response['@odata.count'] || response.value.length);
                
                setLoading(false);
            } catch (err) {
                console.error('Error loading option sets:', err);
                setError('Failed to load option sets. Please try again later.');
                setLoading(false);
            }
        };
        
        loadOptionSets();
    }, [currentPage, pageSize, metadataService]);
    
    // Filter option sets based on search query
    useEffect(() => {
        if (!searchQuery) {
            setFilteredOptionSets(optionSets);
            return;
        }
        
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = optionSets.filter(optionSet => 
            (optionSet.Name || '').toLowerCase().includes(lowerQuery) ||
            (optionSet.DisplayName?.UserLocalizedLabel?.Label || '').toLowerCase().includes(lowerQuery)
        );
        
        setFilteredOptionSets(filtered);
    }, [searchQuery, optionSets]);
    
    // Expand row to show options
    const expandedRowRender = (record: IOptionSetMetadata) => {
        const columns = [
            {
                title: 'Value',
                dataIndex: 'Value',
                key: 'value',
            },
            {
                title: 'Label',
                dataIndex: ['Label', 'UserLocalizedLabel', 'Label'],
                key: 'label',
            },
            {
                title: 'Description',
                key: 'description',
                render: (text: string, option: IOptionMetadata) => 
                    option.Description?.UserLocalizedLabel?.Label || '—'
            }
        ];
        
        return (
            <Table 
                columns={columns} 
                dataSource={record.Options} 
                pagination={false} 
                rowKey="Value" 
            />
        );
    };
    
    // Table columns
    const columns = [
        {
            title: 'Display Name',
            dataIndex: ['DisplayName', 'UserLocalizedLabel', 'Label'],
            key: 'displayName',
            render: (text: string, record: IOptionSetMetadata) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>
                        {text || record.Name}
                    </Typography.Text>
                    {record.IsCustomOptionSet && <Tag color="blue">Custom</Tag>}
                </Space>
            )
        },
        {
            title: 'Name',
            dataIndex: 'Name',
            key: 'name',
            render: (text: string) => (
                <span className="schema-name">{text}</span>
            )
        },
        {
            title: 'Options',
            key: 'options',
            render: (text: string, record: IOptionSetMetadata) => record.Options?.length || 0
        }
    ];
    
    return (
        <Layout>
            <Header style={{ background: '#fff', padding: '0 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Breadcrumb style={{ margin: '16px 0 8px' }}>
                        <Breadcrumb.Item>Metadata Explorer</Breadcrumb.Item>
                        <Breadcrumb.Item>Option Sets</Breadcrumb.Item>
                    </Breadcrumb>
                    <Navigation />
                </div>
            </Header>
            
            <Content className="content-container">
                <div className="page-header">
                    <Title level={2}>
                        <AppstoreOutlined /> Global Option Sets
                        <Badge 
                            count={totalCount} 
                            style={{ backgroundColor: '#52c41a', marginLeft: '8px' }} 
                            overflowCount={9999}
                        />
                    </Title>
                </div>
                
                <Card className="metadata-card">
                    <Input
                        placeholder="Search option sets by name..."
                        prefix={<SearchOutlined />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="entity-search"
                        allowClear
                    />
                    
                    {error && (
                        <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            style={{ marginBottom: '16px' }}
                        />
                    )}
                    
                    <Spin spinning={loading} tip="Loading option sets...">
                        <Table
                            columns={columns}
                            expandable={{ expandedRowRender }}
                            dataSource={filteredOptionSets}
                            rowKey="MetadataId"
                            pagination={false}
                            className="metadata-table"
                        />
                        
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={totalCount}
                                onChange={(page) => setCurrentPage(page)}
                                onShowSizeChange={(current, size) => {
                                    setCurrentPage(1);
                                    setPageSize(size);
                                }}
                                showSizeChanger
                                showQuickJumper
                            />
                        </div>
                    </Spin>
                </Card>
            </Content>
        </Layout>
    );
};

export default OptionSetListView; 