import React, { useState, useEffect } from 'react';
import { 
    Layout, Card, Table, Typography, Breadcrumb, 
    Input, Badge, Spin, Alert, Tag, Pagination, Space
} from 'antd';
import { LinkOutlined, SearchOutlined } from '@ant-design/icons';

import { useMetadataService } from 'api/metadataService';
import { IRelationshipMetadata } from 'models/entityMetadata';
import Navigation from 'components/Navigation';

const { Content, Header } = Layout;
const { Title } = Typography;

const RelationshipListView: React.FC = () => {
    const metadataService = useMetadataService();
    
    // State
    const [relationships, setRelationships] = useState<IRelationshipMetadata[]>([]);
    const [filteredRelationships, setFilteredRelationships] = useState<IRelationshipMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');

    // Load relationships from the API
    useEffect(() => {
        const loadRelationships = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await metadataService.getRelationships(pageSize, currentPage);
                setRelationships(response.value);
                setFilteredRelationships(response.value);
                setTotalCount(response['@odata.count'] || response.value.length);
                
                setLoading(false);
            } catch (err) {
                console.error('Error loading relationships:', err);
                setError('Failed to load relationships. Please try again later.');
                setLoading(false);
            }
        };
        
        loadRelationships();
    }, [currentPage, pageSize, metadataService]);

    // Filter relationships based on search query
    useEffect(() => {
        if (!searchQuery) {
            setFilteredRelationships(relationships);
            return;
        }
        
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = relationships.filter(relationship => 
            relationship.SchemaName.toLowerCase().includes(lowerQuery) ||
            relationship.ReferencedEntity.toLowerCase().includes(lowerQuery) ||
            relationship.ReferencingEntity.toLowerCase().includes(lowerQuery)
        );
        
        setFilteredRelationships(filtered);
    }, [searchQuery, relationships]);

    // Table columns
    const columns = [
        {
            title: 'Schema Name',
            dataIndex: 'SchemaName',
            key: 'schemaName',
            render: (text: string) => (
                <span className="schema-name">{text}</span>
            )
        },
        {
            title: 'Type',
            key: 'relationshipType',
            render: (text: string, record: IRelationshipMetadata) => {
                const typeValue = record.RelationshipType;
                if (typeValue === 0) return <Tag color="blue">One-to-Many</Tag>;
                if (typeValue === 1) return <Tag color="green">Many-to-One</Tag>;
                if (typeValue === 2) return <Tag color="purple">Many-to-Many</Tag>;
                return <Tag>Unknown</Tag>;
            }
        },
        {
            title: 'Referenced Entity',
            dataIndex: 'ReferencedEntity',
            key: 'referencedEntity',
        },
        {
            title: 'Referenced Attribute',
            dataIndex: 'ReferencedAttribute',
            key: 'referencedAttribute',
        },
        {
            title: 'Referencing Entity',
            dataIndex: 'ReferencingEntity',
            key: 'referencingEntity',
        },
        {
            title: 'Referencing Attribute',
            dataIndex: 'ReferencingAttribute',
            key: 'referencingAttribute',
        },
        {
            title: 'Custom',
            key: 'isCustom',
            render: (text: string, record: IRelationshipMetadata) => (
                record.IsCustomRelationship ? <Tag color="blue">Custom</Tag> : <Tag>System</Tag>
            )
        }
    ];

    return (
        <Layout>
            <Header style={{ background: '#fff', padding: '0 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Breadcrumb style={{ margin: '16px 0 8px' }}>
                        <Breadcrumb.Item>Metadata Explorer</Breadcrumb.Item>
                        <Breadcrumb.Item>Relationships</Breadcrumb.Item>
                    </Breadcrumb>
                    <Navigation />
                </div>
            </Header>
            
            <Content className="content-container">
                <div className="page-header">
                    <Title level={2}>
                        <LinkOutlined /> Relationships
                        <Badge 
                            count={totalCount} 
                            style={{ backgroundColor: '#52c41a', marginLeft: '8px' }} 
                            overflowCount={9999}
                        />
                    </Title>
                </div>
                
                <Card className="metadata-card">
                    <Input
                        placeholder="Search relationships by name or entity..."
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
                    
                    <Spin spinning={loading} tip="Loading relationships...">
                        <Table
                            columns={columns}
                            dataSource={filteredRelationships}
                            rowKey="MetadataId"
                            pagination={false}
                            className="metadata-table"
                            scroll={{ x: 'max-content' }}
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

export default RelationshipListView; 