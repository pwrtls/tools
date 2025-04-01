import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Table, Input, Card, Breadcrumb, Typography, Badge, Tag, Pagination, Spin, Alert, Space } from 'antd';
import { DatabaseOutlined, SearchOutlined } from '@ant-design/icons';

import { useMetadataService } from 'api/metadataService';
import { IEntityMetadata } from 'models/entityMetadata';
import Navigation from 'components/Navigation';

const { Content, Header } = Layout;
const { Title } = Typography;

const EntityListView: React.FC = () => {
    const navigate = useNavigate();
    const metadataService = useMetadataService();

    // State for entities
    const [entities, setEntities] = useState<IEntityMetadata[]>([]);
    const [filteredEntities, setFilteredEntities] = useState<IEntityMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');

    // Load entities from the API
    useEffect(() => {
        const loadEntities = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await metadataService.getEntities(pageSize, currentPage);
                setEntities(response.value);
                setFilteredEntities(response.value);
                setTotalCount(response['@odata.count'] || response.value.length);
                
                setLoading(false);
            } catch (err) {
                console.error('Error loading entities:', err);
                setError('Failed to load entities. Please try again later.');
                setLoading(false);
            }
        };
        
        loadEntities();
    }, [currentPage, pageSize, metadataService]);

    // Filter entities based on search query
    useEffect(() => {
        if (!searchQuery) {
            setFilteredEntities(entities);
            return;
        }
        
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = entities.filter(entity => 
            entity.LogicalName.toLowerCase().includes(lowerQuery) ||
            entity.SchemaName.toLowerCase().includes(lowerQuery) ||
            (entity.DisplayName?.UserLocalizedLabel?.Label || '').toLowerCase().includes(lowerQuery)
        );
        
        setFilteredEntities(filtered);
    }, [searchQuery, entities]);

    // Handle entity row click
    const handleEntityClick = (entityId: string) => {
        navigate(`/entities/${entityId}`);
    };

    // Table columns definition
    const columns = [
        {
            title: 'Display Name',
            dataIndex: ['DisplayName', 'UserLocalizedLabel', 'Label'],
            key: 'displayName',
            render: (text: string, record: IEntityMetadata) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>
                        {text || record.SchemaName}
                    </Typography.Text>
                    {record.IsCustomEntity && <Tag color="blue">Custom</Tag>}
                </Space>
            )
        },
        {
            title: 'Logical Name',
            dataIndex: 'LogicalName',
            key: 'logicalName',
            render: (text: string) => (
                <span className="schema-name">{text}</span>
            )
        },
        {
            title: 'Type',
            key: 'type',
            render: (text: string, record: IEntityMetadata) => {
                const types = [];
                
                if (record.IsActivity) types.push(<Tag key="activity">Activity</Tag>);
                if (record.IsIntersect) types.push(<Tag key="intersect">Intersection</Tag>);
                if (record.IsLookupTable) types.push(<Tag key="lookup">Lookup</Tag>);
                
                return types.length ? types : <Tag key="standard">Standard</Tag>;
            }
        },
        {
            title: 'Object Code',
            dataIndex: 'ObjectTypeCode',
            key: 'objectTypeCode',
        }
    ];

    return (
        <Layout>
            <Header style={{ background: '#fff', padding: '0 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Breadcrumb style={{ margin: '16px 0 8px' }}>
                        <Breadcrumb.Item>Metadata Explorer</Breadcrumb.Item>
                        <Breadcrumb.Item>Entities</Breadcrumb.Item>
                    </Breadcrumb>
                    <Navigation />
                </div>
            </Header>
            
            <Content className="content-container">
                <div className="page-header">
                    <Title level={2}>
                        <DatabaseOutlined /> Entities
                        <Badge 
                            count={totalCount} 
                            style={{ backgroundColor: '#52c41a', marginLeft: '8px' }} 
                            overflowCount={9999}
                        />
                    </Title>
                </div>
                
                <Card className="metadata-card">
                    <Input
                        placeholder="Search entities by name..."
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
                    
                    <Spin spinning={loading} tip="Loading entities...">
                        <Table
                            columns={columns}
                            dataSource={filteredEntities}
                            rowKey="MetadataId"
                            pagination={false}
                            className="metadata-table"
                            onRow={(record) => ({
                                onClick: () => handleEntityClick(record.MetadataId),
                                className: 'clickable'
                            })}
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

export default EntityListView; 