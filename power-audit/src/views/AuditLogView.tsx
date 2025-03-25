import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, DatePicker, Select, Row, Col, Card, Input, Space, Spin, message, Modal } from 'antd';
import { DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import moment from 'moment';

import { usePowerToolsApi } from 'powertools/apiHook';
import { useAuditLogsService } from 'api/auditLogs';
import { IAuditLog, operationLabels } from 'models/auditLog';
import { IoDataResponse } from 'models/oDataResponse';

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
  const { isLoaded, get, getAsJson } = usePowerToolsApi();
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
      
      // Check if we can use PowerToolsUI's download method directly
      if (window.PowerTools && typeof window.PowerTools.download === 'function') {
        // Use the service which now checks for PowerTools.download
        await auditService.exportAuditLogsAsCsv(
          startDate,
          endDate,
          operation,
          entityName,
          userId
        );
        message.success('Audit logs exported successfully');
      } else {
        // We need to implement a fallback that gets the data and uses clipboard
        const query = new URLSearchParams();
        
        // Select relevant fields
        query.set('$select', 'auditid,createdon,operation,action,objecttypecode,attributemask,_userid_value,transactionid');
        
        // Build filter based on parameters
        const filters: string[] = [];
        
        if (startDate) {
          filters.push(`createdon ge ${startDate.toISOString()}`);
        }
        
        if (endDate) {
          filters.push(`createdon le ${endDate.toISOString()}`);
        }
        
        if (operation !== undefined) {
          filters.push(`operation eq ${operation}`);
        }
        
        if (entityName) {
          filters.push(`objecttypecode eq '${entityName}'`);
        }
        
        if (userId) {
          filters.push(`_userid_value eq ${userId}`);
        }
        
        if (filters.length > 0) {
          query.set('$filter', filters.join(' and '));
        }
        
        // Set large page size for export
        query.set('$top', '5000');
        
        // Add ordering by creation date desc
        query.set('$orderby', 'createdon desc');
        
        // Get response using API context directly with getAsJson
        const response = await getAsJson<IoDataResponse<IAuditLog>>('/api/data/v9.0/audits', query);
        if (!response || !response.value || !Array.isArray(response.value)) {
          throw new Error('Invalid response format from API');
        }
        
        // Convert JSON data to CSV
        const csvData = convertToCSV(response.value);
        if (!csvData) {
          throw new Error('Empty CSV data received');
        }
        
        // Generate a filename with current date
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `audit_logs_${dateStr}.csv`;
        
        // Copy to clipboard as fallback
        const textarea = document.createElement('textarea');
        textarea.value = csvData;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        
        // Select the text and copy to clipboard
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // Show success message with instructions
        message.success('Audit logs copied to clipboard. You can now paste into a text editor and save as a .csv file.');
        
        // Open popup with instructions
        Modal.info({
          title: 'Export Successful',
          content: (
            <div>
              <p>The audit logs have been copied to your clipboard.</p>
              <p>To save the data:</p>
              <ol>
                <li>Open a text editor (like Notepad, TextEdit, etc.)</li>
                <li>Paste the clipboard content (Ctrl+V or Cmd+V)</li>
                <li>Save the file with a .csv extension</li>
                <li>The suggested filename is: <strong>{filename}</strong></li>
              </ol>
            </div>
          ),
          onOk() {},
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      setError('Failed to export audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert JSON array to CSV string
  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) {
      return '';
    }
    
    // Get headers from the first object
    const headers = Object.keys(data[0])
      .filter(key => !key.startsWith('@')); // Skip OData annotation properties
    
    // Add headers row
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    for (const item of data) {
      const row = headers
        .map(header => {
          const value = item[header];
          
          // Handle null/undefined values
          if (value === null || value === undefined) {
            return '';
          }
          
          // Handle strings, escape quotes and commas
          if (typeof value === 'string') {
            // Escape quotes by doubling them and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
          }
          
          // For other types, convert to string
          return String(value);
        })
        .join(',');
      
      csv += row + '\n';
    }
    
    return csv;
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