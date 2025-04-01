import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Layout, Card, Tabs, Table, Typography, Breadcrumb, 
    Descriptions, Tag, Button, message, Spin, Alert, Space, Tooltip, Divider
} from 'antd';
import { 
    DatabaseOutlined, ArrowLeftOutlined, 
    DownloadOutlined, LinkOutlined, TagsOutlined
} from '@ant-design/icons';

import { useMetadataService } from 'api/metadataService';
import { IEntityMetadata, IAttributeMetadata, IRelationshipMetadata } from 'models/entityMetadata';
import Navigation from 'components/Navigation';

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const EntityDetailView: React.FC = () => {
    const { entityId } = useParams<{ entityId: string }>();
    const navigate = useNavigate();
    const metadataService = useMetadataService();
    
    // Component state
    const [entity, setEntity] = useState<IEntityMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    
    // Load entity details on mount
    useEffect(() => {
        const loadEntityDetails = async () => {
            if (!entityId) {
                setError('Entity ID is required');
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                setError(null);
                
                const entityData = await metadataService.getEntityById(entityId);
                setEntity(entityData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading entity details:', err);
                setError('Failed to load entity details. Please try again later.');
                setLoading(false);
            }
        };
        
        loadEntityDetails();
    }, [entityId, metadataService]);
    
    // Handle navigation back to entities list
    const handleBack = () => {
        navigate('/');
    };
    
    // Handle exporting entity metadata as JSON
    const handleExport = async () => {
        if (!entityId) return;
        
        try {
            setExporting(true);
            await metadataService.exportEntityMetadata(entityId);
            message.success('Metadata exported successfully');
            setExporting(false);
        } catch (err) {
            console.error('Error exporting metadata:', err);
            message.error('Failed to export metadata');
            setExporting(false);
        }
    };
    
    // Copy text to clipboard
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(
            () => {
                message.success(`${label} copied to clipboard`);
            },
            () => {
                message.error(`Failed to copy ${label.toLowerCase()}`);
            }
        );
    };
    
    // Attribute columns configuration
    const attributeColumns = [
        {
            title: 'Display Name',
            dataIndex: ['DisplayName', 'UserLocalizedLabel', 'Label'],
            key: 'displayName',
            render: (text: string, record: IAttributeMetadata) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text || record.SchemaName}</Text>
                    {record.IsCustomAttribute && <Tag color="blue">Custom</Tag>}
                    {record.IsPrimaryId && <Tag color="green">Primary Key</Tag>}
                    {record.IsPrimaryName && <Tag color="purple">Primary Name</Tag>}
                </Space>
            )
        },
        {
            title: 'Logical Name',
            dataIndex: 'LogicalName',
            key: 'logicalName',
            render: (text: string) => (
                <Tooltip title="Click to copy">
                    <span 
                        className="schema-name clickable"
                        onClick={() => copyToClipboard(text, 'Logical name')}
                    >
                        {text}
                    </span>
                </Tooltip>
            )
        },
        {
            title: 'Type',
            dataIndex: ['AttributeTypeName', 'Value'],
            key: 'type',
        },
        {
            title: 'Properties',
            key: 'properties',
            render: (text: string, record: IAttributeMetadata) => {
                const properties: JSX.Element[] = [];
                
                if (record.RequiredLevel?.Value === 'ApplicationRequired') {
                    properties.push(<Tag key="required" color="red">Required</Tag>);
                }
                
                if (record.IsValidForCreate) {
                    properties.push(<Tag key="create" color="green">Create</Tag>);
                }
                
                if (record.IsValidForUpdate) {
                    properties.push(<Tag key="update" color="orange">Update</Tag>);
                }
                
                if (record.IsValidForRead) {
                    properties.push(<Tag key="read" color="blue">Read</Tag>);
                }
                
                return <Space>{properties}</Space>;
            }
        }
    ];
    
    // Relationship columns configuration
    const relationshipColumns = [
        {
            title: 'Schema Name',
            dataIndex: 'SchemaName',
            key: 'schemaName',
            render: (text: string) => (
                <Tooltip title="Click to copy">
                    <span 
                        className="schema-name clickable"
                        onClick={() => copyToClipboard(text, 'Schema name')}
                    >
                        {text}
                    </span>
                </Tooltip>
            )
        },
        {
            title: 'Referenced Entity',
            dataIndex: 'ReferencedEntity',
            key: 'referencedEntity',
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
                        <Breadcrumb.Item onClick={handleBack} className="clickable">Entities</Breadcrumb.Item>
                        <Breadcrumb.Item>{entity?.DisplayName?.UserLocalizedLabel?.Label || entity?.LogicalName || 'Entity Details'}</Breadcrumb.Item>
                    </Breadcrumb>
                    <Navigation />
                </div>
            </Header>
            
            <Content className="content-container">
                {error && (
                    <Alert
                        message="Error"
                        description={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: '16px' }}
                    />
                )}
                
                <Spin spinning={loading} tip="Loading entity details...">
                    {entity && (
                        <>
                            <div className="page-header">
                                <Space>
                                    <Button 
                                        type="default" 
                                        icon={<ArrowLeftOutlined />} 
                                        onClick={handleBack}
                                    >
                                        Back to Entities
                                    </Button>
                                    
                                    <Button 
                                        type="primary" 
                                        icon={<DownloadOutlined />} 
                                        onClick={handleExport}
                                        loading={exporting}
                                    >
                                        Export Metadata
                                    </Button>
                                </Space>
                                
                                <Title level={2} style={{ marginTop: '16px' }}>
                                    <DatabaseOutlined /> {entity.DisplayName?.UserLocalizedLabel?.Label || entity.SchemaName}
                                </Title>
                                
                                <Paragraph type="secondary">
                                    <Tooltip title="Click to copy">
                                        <span 
                                            className="schema-name clickable" 
                                            onClick={() => copyToClipboard(entity.LogicalName, 'Logical name')}
                                        >
                                            {entity.LogicalName}
                                        </span>
                                    </Tooltip>
                                </Paragraph>
                            </div>
                            
                            <Card className="metadata-card">
                                <Descriptions title="Entity Properties" bordered column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                                    <Descriptions.Item label="Logical Name">{entity.LogicalName}</Descriptions.Item>
                                    <Descriptions.Item label="Schema Name">{entity.SchemaName}</Descriptions.Item>
                                    <Descriptions.Item label="Entity Set Name">{entity.EntitySetName}</Descriptions.Item>
                                    <Descriptions.Item label="Object Type Code">{entity.ObjectTypeCode}</Descriptions.Item>
                                    <Descriptions.Item label="Primary ID Attribute">{entity.PrimaryIdAttribute}</Descriptions.Item>
                                    <Descriptions.Item label="Primary Name Attribute">{entity.PrimaryNameAttribute}</Descriptions.Item>
                                    <Descriptions.Item label="Custom Entity">{entity.IsCustomEntity ? 'Yes' : 'No'}</Descriptions.Item>
                                    <Descriptions.Item label="Intersection Entity">{entity.IsIntersect ? 'Yes' : 'No'}</Descriptions.Item>
                                    <Descriptions.Item label="Activity Entity">{entity.IsActivity ? 'Yes' : 'No'}</Descriptions.Item>
                                    <Descriptions.Item label="Description">
                                        {entity.Description?.UserLocalizedLabel?.Label || 'No description available'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                            
                            <Card className="metadata-card">
                                <Tabs defaultActiveKey="attributes">
                                    <TabPane 
                                        tab={
                                            <span>
                                                <TagsOutlined />
                                                Attributes ({entity.Attributes?.length || 0})
                                            </span>
                                        } 
                                        key="attributes"
                                    >
                                        <Table 
                                            columns={attributeColumns} 
                                            dataSource={entity.Attributes} 
                                            rowKey="MetadataId" 
                                            className="metadata-table"
                                            pagination={{ pageSize: 20, showSizeChanger: true }}
                                            scroll={{ x: 'max-content' }}
                                        />
                                    </TabPane>
                                    
                                    <TabPane 
                                        tab={
                                            <span>
                                                <LinkOutlined />
                                                Relationships ({
                                                    (entity.OneToManyRelationships?.length || 0) + 
                                                    (entity.ManyToOneRelationships?.length || 0) + 
                                                    (entity.ManyToManyRelationships?.length || 0)
                                                })
                                            </span>
                                        } 
                                        key="relationships"
                                    >
                                        <div>
                                            <Title level={4}>One-to-Many Relationships ({entity.OneToManyRelationships?.length || 0})</Title>
                                            <Table 
                                                columns={relationshipColumns} 
                                                dataSource={entity.OneToManyRelationships} 
                                                rowKey="MetadataId" 
                                                className="metadata-table"
                                                pagination={{ pageSize: 10, showSizeChanger: true }}
                                                scroll={{ x: 'max-content' }}
                                            />
                                            
                                            <Divider />
                                            
                                            <Title level={4}>Many-to-One Relationships ({entity.ManyToOneRelationships?.length || 0})</Title>
                                            <Table 
                                                columns={relationshipColumns} 
                                                dataSource={entity.ManyToOneRelationships} 
                                                rowKey="MetadataId" 
                                                className="metadata-table"
                                                pagination={{ pageSize: 10, showSizeChanger: true }}
                                                scroll={{ x: 'max-content' }}
                                            />
                                            
                                            <Divider />
                                            
                                            <Title level={4}>Many-to-Many Relationships ({entity.ManyToManyRelationships?.length || 0})</Title>
                                            <Table 
                                                columns={relationshipColumns} 
                                                dataSource={entity.ManyToManyRelationships} 
                                                rowKey="MetadataId" 
                                                className="metadata-table"
                                                pagination={{ pageSize: 10, showSizeChanger: true }}
                                                scroll={{ x: 'max-content' }}
                                            />
                                        </div>
                                    </TabPane>
                                </Tabs>
                            </Card>
                        </>
                    )}
                </Spin>
            </Content>
        </Layout>
    );
};

export default EntityDetailView; 