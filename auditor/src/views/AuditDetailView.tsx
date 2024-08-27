import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Spin, Table, Typography } from 'antd';
import { usePowerToolsApi } from 'powertools/apiHook';
import { IFormattedAuditRecord } from 'models/auditRecord';

const { Title, Text } = Typography;

export const AuditDetailView: React.FC = () => {
    const { auditId } = useParams<{ auditId: string }>();
    const [auditRecord, setAuditRecord] = useState<IFormattedAuditRecord | null>(null);
    const [auditDetails, setAuditDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getAsJson } = usePowerToolsApi();

    useEffect(() => {
        let isMounted = true;

        const fetchAuditDetail = async () => {
            if (!auditId) return;
            try {
                setLoading(true);
                console.log('Fetching audit detail for ID:', auditId);
                const response = await getAsJson<IFormattedAuditRecord>(
                    `/api/data/v9.2/audits(${auditId})?$expand=userid($select=fullname)`
                );
                console.log('Audit detail response:', response);
                if (isMounted) {
                    if (response) {
                        setAuditRecord(response);
                        // Fetch additional audit details
                        const detailsResponse = await getAsJson<{ AuditDetail: any }>(
                            `/api/data/v9.2/RetrieveAuditDetails(AuditId=${auditId})`
                        );
                        setAuditDetails(detailsResponse.AuditDetail);
                    } else {
                        setError('Audit record not found');
                    }
                }
            } catch (err) {
                console.error('Error fetching audit detail:', err);
                if (isMounted) {
                    setError(`Failed to fetch audit detail: ${err instanceof Error ? err.message : String(err)}`);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchAuditDetail();

        return () => {
            isMounted = false;
        };
    }, [auditId, getAsJson]);

    console.log('AuditDetailView state:', { loading, error, auditRecord, auditDetails });

    if (loading) {
        return <Spin size="large" />;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!auditRecord) {
        return <div>No audit record found</div>;
    }

    const getActionLabel = (action: string | number) => {
        const actionNumber = typeof action === 'string' ? parseInt(action, 10) : action;
        const actionMap: { [key: number]: string } = {
            1: 'Create', 2: 'Update', 3: 'Delete', 4: 'Activate',
            // Add more mappings as needed
        };
        return actionMap[actionNumber] || `Unknown (${action})`;
    };

    const getOperationLabel = (operation: string | number) => {
        const operationNumber = typeof operation === 'string' ? parseInt(operation, 10) : operation;
        const operationMap: { [key: number]: string } = {
            1: 'Create', 2: 'Update', 3: 'Delete', 4: 'Access',
            // Add more mappings as needed
        };
        return operationMap[operationNumber] || `Unknown (${operation})`;
    };

    const renderChanges = () => {
        if (!auditDetails || !auditDetails.OldValue || !auditDetails.NewValue) {
            return <Text>No changes recorded</Text>;
        }

        const changes = Object.keys(auditDetails.NewValue).map(key => ({
            key,
            attribute: key,
            oldValue: auditDetails.OldValue[key],
            newValue: auditDetails.NewValue[key],
        }));

        return (
            <Table
                dataSource={changes}
                columns={[
                    { title: 'Attribute', dataIndex: 'attribute', key: 'attribute' },
                    { title: 'Old Value', dataIndex: 'oldValue', key: 'oldValue' },
                    { title: 'New Value', dataIndex: 'newValue', key: 'newValue' },
                ]}
                pagination={false}
            />
        );
    };

    return (
        <Card title={<Title level={3}>{`Audit Detail - ${auditRecord.auditid}`}</Title>}>
            <Text strong>Operation: </Text><Text>{getOperationLabel(auditRecord.operation)}</Text><br />
            <Text strong>Action: </Text><Text>{getActionLabel(auditRecord.action)}</Text><br />
            <Text strong>Created On: </Text><Text>{new Date(auditRecord.createdon).toLocaleString()}</Text><br />
            <Text strong>User: </Text><Text>{auditRecord.userid?.fullname || 'Unknown'}</Text><br />
            <Text strong>Entity: </Text><Text>{auditRecord.objecttypecode}</Text><br />
            <Text strong>Record ID: </Text><Text>{auditRecord._objectid_value}</Text><br />
            
            <Title level={4} style={{ marginTop: '20px' }}>Changes</Title>
            {renderChanges()}
        </Card>
    );
};