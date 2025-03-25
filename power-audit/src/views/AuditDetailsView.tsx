import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Descriptions, Spin, Divider, Typography, Alert, Space, message, Modal } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { usePowerToolsApi } from 'powertools/apiHook';
import { useAuditLogsService } from 'api/auditLogs';
import { IAuditLog, IAuditLogDetails, operationLabels } from 'models/auditLog';

const { Title } = Typography;

const AuditDetailsView: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const { isLoaded } = usePowerToolsApi();
  const auditService = useAuditLogsService();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [auditLog, setAuditLog] = useState<IAuditLog | null>(null);
  const [auditDetails, setAuditDetails] = useState<IAuditLogDetails[]>([]);
  const [entityDisplayName, setEntityDisplayName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [attributeDisplayNames, setAttributeDisplayNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoaded && auditId) {
      loadAuditDetails();
    }
  }, [isLoaded, auditId]);

  // Function to fetch display names for all attributes in the audit details
  const fetchAttributeDisplayNames = async (entityType: string, attributes: string[]) => {
    console.log(`Fetching display names for ${attributes.length} attributes of entity ${entityType}`);
    
    if (!entityType || attributes.length === 0) return {};
    
    try {
      // Use the fetchEntityAttributeDisplayNames function from the audit service
      const displayNamesMap = await auditService.fetchEntityAttributeDisplayNames(entityType);
      
      // Convert map to object for easier React state management
      const displayNamesObj: Record<string, string> = {};
      
      // Process each attribute to get its display name
      for (const attr of attributes) {
        if (displayNamesMap.has(attr)) {
          displayNamesObj[attr] = displayNamesMap.get(attr)!;
        } else {
          // Fallback: Format the logical name for display
          displayNamesObj[attr] = attr;
        }
      }
      
      console.log('Attribute display names:', displayNamesObj);
      return displayNamesObj;
    } catch (error) {
      console.error('Error fetching attribute display names:', error);
      // Fallback: Use the logical names as is
      return attributes.reduce((acc, attr) => {
        acc[attr] = attr;
        return acc;
      }, {} as Record<string, string>);
    }
  };

  const loadAuditDetails = async () => {
    if (!auditId) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log('Loading audit details for ID:', auditId);
      // Fetch the main audit log record
      const query = new URLSearchParams();
      query.set('$filter', `auditid eq ${auditId}`);
      const auditResponse = await auditService.fetchAuditLogs(undefined, undefined, undefined, undefined, undefined, 1, 1);
      
      if (auditResponse?.value?.length > 0) {
        console.log('Found audit record:', auditResponse.value[0]);
        const logRecord = auditResponse.value[0];
        setAuditLog(logRecord);
        
        // Get entity display name if not already fetched
        if (logRecord.objecttypecode && !logRecord.objecttypecode_formatted) {
          try {
            const displayName = await auditService.fetchEntityDisplayName(logRecord.objecttypecode);
            setEntityDisplayName(displayName);
          } catch (error) {
            console.error('Error fetching entity display name:', error);
          }
        } else if (logRecord.objecttypecode_formatted) {
          setEntityDisplayName(logRecord.objecttypecode_formatted);
        }
        
        // Get user name if not already fetched
        if (logRecord._userid_value && !logRecord.username) {
          try {
            const name = await auditService.fetchUserName(logRecord._userid_value);
            setUserName(name);
          } catch (error) {
            console.error('Error fetching user name:', error);
          }
        } else if (logRecord.username) {
          setUserName(logRecord.username);
        }
        
        // Fetch the audit details
        const detailsResponse = await auditService.fetchAuditDetails(auditId);
        console.log('Found audit details:', detailsResponse.length);
        
        if (detailsResponse.length > 0) {
          setAuditDetails(detailsResponse);
          
          // Extract attribute logical names from the details
          const attributeLogicalNames = detailsResponse.map(detail => 
            detail.attributemask || detail.attributename
          ).filter(Boolean) as string[];
          
          // Now fetch display names for all these attributes
          if (logRecord.objecttypecode && attributeLogicalNames.length > 0) {
            const displayNames = await fetchAttributeDisplayNames(
              logRecord.objecttypecode,
              attributeLogicalNames
            );
            
            setAttributeDisplayNames(displayNames);
          }
        }
      } else {
        console.log('No audit record found with ID:', auditId);
        setError(`No audit record found with ID: ${auditId}`);
      }
    } catch (error) {
      console.error('Error loading audit details:', error);
      setError('Failed to load audit details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };
  
  // Helper function to get display name for an attribute
  const getAttributeDisplayName = (attributeName: string): string => {
    // Try to get from our fetched display names
    if (attributeDisplayNames[attributeName]) {
      return attributeDisplayNames[attributeName];
    }
    
    // If attributeName is the logical name but we have attributemask, try that
    const detail = auditDetails.find(d => d.attributename === attributeName);
    if (detail?.attributemask && attributeDisplayNames[detail.attributemask]) {
      return attributeDisplayNames[detail.attributemask];
    }
    
    // Fallback to whatever we have
    return attributeName;
  };

  const columns = [
    {
      title: 'Attribute',
      dataIndex: 'attributename',
      key: 'attributename',
      render: (name: string, record: IAuditLogDetails) => {
        return getAttributeDisplayName(record.attributemask || name);
      }
    },
    {
      title: 'Old Value',
      dataIndex: 'oldvalue',
      key: 'oldvalue'
    },
    {
      title: 'New Value',
      dataIndex: 'newvalue',
      key: 'newvalue'
    }
  ];

  // Function to export audit details to CSV
  const exportToCSV = () => {
    try {
      if (!auditLog || auditDetails.length === 0) {
        message.warning('No audit details available to export');
        return;
      }

      // Create CSV headers
      const headers = ['Attribute', 'Old Value', 'New Value'];
      
      // Format data rows
      const rows = auditDetails.map(detail => {
        const attributeName = getAttributeDisplayName(detail.attributemask || detail.attributename || '');
        return [
          attributeName,
          detail.oldvalue || '',
          detail.newvalue || ''
        ];
      });
      
      // Add metadata as first rows
      const metadata = [
        ['Audit Information', '', ''],
        ['Audit ID', auditLog.auditid, ''],
        ['Created On', dayjs(auditLog.createdon).format('YYYY-MM-DD HH:mm:ss'), ''],
        ['Operation', operationLabels[auditLog.operation] || auditLog.operation, ''],
        ['Entity', entityDisplayName || auditLog.objecttypecode_formatted || auditLog.objecttypecode, ''],
        ['Record ID', auditLog.objectid || auditLog.transactionid || 'N/A', ''],
        ['User', userName || auditLog.username || auditLog._userid_value || auditLog.userid || 'N/A', ''],
        ['', '', ''], // Empty row as separator
        headers // Column headers
      ];
      
      // Combine metadata and data rows
      const csvContent = [
        ...metadata,
        ...rows
      ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      // Set filename based on entity and date
      const entityName = entityDisplayName || auditLog.objecttypecode || 'record';
      const formattedDate = dayjs(auditLog.createdon).format('YYYY-MM-DD_HHmmss');
      const filename = `audit_${entityName.replace(/\s+/g, '_').toLowerCase()}_${formattedDate}.csv`;
      
      // Use PowerToolsUI's built-in download method if available
      if (window.PowerTools && typeof window.PowerTools.download === 'function') {
        // Call the PowerToolsUI download method directly
        window.PowerTools.download(csvContent, filename, 'text/csv');
        message.success('Audit details exported successfully');
      } else {
        // Fallback to clipboard copy method
        const textarea = document.createElement('textarea');
        textarea.value = csvContent;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        
        // Select the text and copy to clipboard
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // Show success message with instructions
        message.success('Audit details copied to clipboard. You can now paste into a text editor and save as a .csv file.');
        
        // Open popup with instructions
        Modal.info({
          title: 'Export Successful',
          content: (
            <div>
              <p>The audit details have been copied to your clipboard.</p>
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
      console.error('Error exporting audit details:', error);
      message.error('Failed to export audit details');
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading PowerTools API..." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading audit details..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" message="Error" description={error} showIcon />
        <div style={{ marginTop: '16px' }}>
          <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back to Audit Logs
          </Button>
        </div>
      </Card>
    );
  }

  if (!auditLog) {
    return (
      <Card>
        <Title level={4}>Audit record not found</Title>
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Back to Audit Logs
        </Button>
      </Card>
    );
  }

  return (
    <div className="audit-details-view">
      <Card
        bordered={false}
        title={
          <Space>
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Back
            </Button>
            <Button 
              type="default" 
              icon={<DownloadOutlined />} 
              onClick={exportToCSV}
              disabled={loading || !auditLog || auditDetails.length === 0}
            >
              Export
            </Button>
          </Space>
        }
      >
        <Descriptions title="Audit Information" bordered>
          <Descriptions.Item label="Audit ID">{auditLog.auditid}</Descriptions.Item>
          <Descriptions.Item label="Created On">{dayjs(auditLog.createdon).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          <Descriptions.Item label="Operation">{operationLabels[auditLog.operation] || auditLog.operation}</Descriptions.Item>
          <Descriptions.Item label="Entity">
            {entityDisplayName || auditLog.objecttypecode_formatted || auditLog.objecttypecode}
            {entityDisplayName && entityDisplayName !== auditLog.objecttypecode && ` (${auditLog.objecttypecode})`}
          </Descriptions.Item>
          <Descriptions.Item label="Record ID">{auditLog.objectid || auditLog.transactionid || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="User">
            {userName || auditLog.username || auditLog._userid_value || auditLog.userid || 'N/A'}
          </Descriptions.Item>
        </Descriptions>
        
        <Divider />
        
        <Title level={4}>Changes</Title>
        <Table 
          dataSource={auditDetails} 
          columns={columns} 
          rowKey="auditdetailid"
          pagination={false}
          locale={{ emptyText: 'No changes found for this audit record' }}
        />
      </Card>
    </div>
  );
};

export default AuditDetailsView; 