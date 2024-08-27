import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Spin, Button, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { usePowerToolsApi } from 'powertools/apiHook';
import { IFormattedAuditRecord, IAuditRecord } from 'models/auditRecord';
import { getOperationName, getActionName } from '../utils/auditHelpers';

export const AuditView: React.FC = () => {
    const [auditRecords, setAuditRecords] = useState<IFormattedAuditRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { getAsJson } = usePowerToolsApi();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [lastAuditId, setLastAuditId] = useState<string | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const formatAuditRecord = useCallback((record: IAuditRecord): IFormattedAuditRecord => ({
        ...record,
        operation: getOperationName(record.operation),
        action: getActionName(record.action),
        versionnumber: record.versionnumber.toString(),
    }), []);

    const fetchAuditRecords = useCallback(async () => {
        if (loading) return;
        try {
            setLoading(true);
            const query = new URLSearchParams({
                $select: '_objectid_value,_userid_value,operation,createdon,auditid,action,objecttypecode',
                $top: '100',
                $orderby: 'createdon desc,auditid desc'
            });

            if (lastAuditId) {
                query.append('$filter', `auditid lt ${lastAuditId}`);
            }

            const response = await getAsJson<{ value: IAuditRecord[] } | { error: any }>(
                '/api/data/v9.2/audits',
                query
            );
            
            console.log('API Response:', response);

            if ('error' in response) {
                setError(`Failed to fetch audit records: ${JSON.stringify(response.error)}`);
                setHasMore(false);
            } else if (response && response.value && response.value.length > 0) {
                const formattedRecords = response.value.map(formatAuditRecord);
                
                setAuditRecords(prev => [...prev, ...formattedRecords]);
                setHasMore(formattedRecords.length > 0);
                if (formattedRecords.length > 0) {
                    setLastAuditId(formattedRecords[formattedRecords.length - 1].auditid);
                }
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error fetching audit records:', err);
            setError(`Failed to fetch audit records: ${err instanceof Error ? err.message : String(err)}`);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [loading, lastAuditId, formatAuditRecord, getAsJson]);

    useEffect(() => {
        if (!error && hasMore && auditRecords.length === 0) {
            fetchAuditRecords();
        }
    }, [fetchAuditRecords, error, hasMore, auditRecords.length]);

    const handleScroll = useCallback(() => {
        const table = tableRef.current;
        if (table && hasMore && !loading) {
            const { scrollTop, scrollHeight, clientHeight } = table;
            if (scrollHeight - scrollTop <= clientHeight * 1.5) {
                fetchAuditRecords();
            }
        }
    }, [hasMore, loading, fetchAuditRecords]);

    useEffect(() => {
        const table = tableRef.current;
        if (table) {
            table.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (table) {
                table.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]);

    const columns = [
        {
            title: 'Date',
            dataIndex: 'createdon',
            key: 'createdon',
        },
        {
            title: 'Operation',
            dataIndex: 'operation',
            key: 'operation',
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
        },
        {
            title: 'Entity',
            dataIndex: 'objecttypecode',
            key: 'objecttypecode',
        },
    ];

    return (
        <Card title="Audit Records">
            {error ? (
                <div style={{ color: 'red', textAlign: 'center' }}>
                    <p>Error: {error}</p>
                    <Button onClick={() => { setError(null); setHasMore(true); setAuditRecords([]); setLastAuditId(null); }}>Retry</Button>
                </div>
            ) : (
                <div
                    ref={tableRef}
                    style={{
                        height: 'calc(100vh - 200px)',
                        overflow: 'auto',
                    }}
                >
                    <Table
                        dataSource={auditRecords}
                        columns={columns}
                        rowKey="auditid"
                        pagination={false}
                        onRow={(record) => ({
                            onClick: () => navigate(`/audit/${record.auditid}`),
                        })}
                    />
                    {loading && <Spin tip="Loading..." style={{ display: 'block', margin: '20px auto' }} />}
                    {!hasMore && <p style={{ textAlign: 'center', margin: '20px 0' }}><b>No more records</b></p>}
                </div>
            )}
        </Card>
    );
};