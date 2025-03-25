import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, DatePicker, Select, Row, Col, Card, Input, Space, Spin } from 'antd';
import { DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import moment from 'moment';

import { usePowerToolsApi } from 'powertools/apiHook';
import { useAuditLogsService } from 'api/auditLogs';
import { IAuditLog, operationLabels } from 'models/auditLog';

const { RangePicker } = DatePicker;
const { Option } = Select;

// CSS for clickable rows
const clickableRowStyle = {
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: '#f5f5f5'
  }
};

const AuditLogView: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded } = usePowerToolsApi();
  const auditService = useAuditLogsService();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [operation, setOperation] = useState<number | undefined>(undefined);
  const [entityName, setEntityName] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState<number>(50);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Load audit logs when component mounts or filters change
  useEffect(() => {
    if (isLoaded) {
      loadAuditLogs();
    }
  }, [isLoaded, pageNumber, pageSize]);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Convert Dayjs to JavaScript Date
      const startDate = dateRange?.[0]?.toDate();
      const endDate = dateRange?.[1]?.toDate();
      
      console.log('Loading audit logs with filters:', {
        startDate,
        endDate,
        operation,
        entityName,
        userId
      });
      
      const response = await auditService.fetchAuditLogs(
        startDate,
        endDate,
        operation,
        entityName,
        userId,
        pageSize,
        pageNumber
      );
      
      // Added null checking to prevent "Cannot read properties of undefined" errors
      const responseValue = response?.value || [];
      console.log('Successfully loaded audit logs:', responseValue.length);
      setAuditLogs(responseValue);
      setTotal(response?.['@odata.count'] || responseValue.length || 0);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setError('Failed to load audit logs. Please try again.');
      setAuditLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      const startDate = dateRange?.[0]?.toDate();
      const endDate = dateRange?.[1]?.toDate();
      
      await auditService.exportAuditLogsAsCsv(
        startDate,
        endDate,
        operation,
        entityName,
        userId
      );
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      setError('Failed to export audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPageNumber(1);
    loadAuditLogs();
  };

  const handleReset = () => {
    setDateRange(null);
    setOperation(undefined);
    setEntityName(undefined);
    setUserId(undefined);
    setPageNumber(1);
    setError(null);
    loadAuditLogs();
  };

  const handleRowClick = (record: IAuditLog) => {
    navigate(`/audit-details/${record.auditid}`);
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdon',
      key: 'createdon',
      render: (date: string) => {
        if (!date) return '';
        return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
      }
    },
    {
      title: 'Operation',
      dataIndex: 'operation_formatted',
      key: 'operation'
    },
    {
      title: 'Entity',
      dataIndex: 'objecttypecode',
      key: 'objecttypecode',
      render: (schemaName: string, record: IAuditLog) => {
        if (!schemaName) return 'N/A';
        const displayName = record.objecttypecode_formatted || schemaName;
        return displayName !== schemaName 
          ? `${displayName} (${schemaName})` 
          : schemaName;
      }
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: IAuditLog) => {
        return username || record._userid_value || record.userid || 'N/A';
      }
    }
  ];

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading PowerTools API..." />
      </div>
    );
  }

  return (
    <div className="audit-log-view">
      <Card title="Audit Log Explorer" bordered={false}>
        {error && (
          <div style={{ color: 'red', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        <Row gutter={16} className="filter-row">
          <Col span={8}>
            <label>Date Range:</label>
            <RangePicker 
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0] as Dayjs | null, dates[1] as Dayjs | null]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Col>
          <Col span={6}>
            <label>Operation:</label>
            <Select
              style={{ width: '100%' }}
              value={operation}
              onChange={setOperation}
              allowClear
              placeholder="Select operation"
            >
              {Object.entries(operationLabels).map(([key, label]) => (
                <Option key={key} value={parseInt(key)}>{label}</Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <label>Entity Name:</label>
            <Input 
              placeholder="Entity name"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
            />
          </Col>
          <Col span={5}>
            <label>User ID:</label>
            <Input 
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </Col>
        </Row>
        <Row className="filter-row">
          <Col span={24}>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />} 
                onClick={handleSearch}
              >
                Search
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
              >
                Export to CSV
              </Button>
            </Space>
          </Col>
        </Row>
        
        <Table 
          dataSource={auditLogs} 
          columns={columns} 
          rowKey="auditid"
          loading={loading}
          pagination={{
            current: pageNumber,
            pageSize: pageSize,
            total: total,
            onChange: (page) => setPageNumber(page),
            onShowSizeChange: (_, size) => {
              setPageSize(size);
              setPageNumber(1);
            }
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' }
          })}
        />
      </Card>
    </div>
  );
};

export default AuditLogView; 