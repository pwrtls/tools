import React from 'react';
import { List, Card, Typography, Space, Tag, Button, Empty, Checkbox, Tooltip, Pagination } from 'antd';
import { ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Flow } from '../models/Flow';

const { Title, Text } = Typography;

interface FlowListProps {
  onFlowSelect: (flow: Flow) => void;
  searchText: string;
  filteredFlows: Flow[];
  selectedFlows: string[];
  onSelectFlow: (id: string, isSelected: boolean) => void;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  totalCount?: number;
  onPageChange: (page: number, pageSize?: number) => void;
}

export const FlowList: React.FC<FlowListProps> = ({ 
  onFlowSelect, 
  searchText, 
  filteredFlows, 
  selectedFlows, 
  onSelectFlow,
  loading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange
}) => {
  if (loading) {
    return (
      <div className="flow-list-loading">
        <List loading={true} dataSource={[]} renderItem={() => <></>} />
      </div>
    );
  }

  const SearchTip = () => (
    <Space align="center" style={{ marginBottom: 16 }}>
      <InfoCircleOutlined />
      <Tooltip title="Searches are performed on the server with results filtered by name and description">
        <Text type="secondary">
          Enter search terms to filter flows from the server
        </Text>
      </Tooltip>
    </Space>
  );

  return (
    <div className="flow-list-container">
      {!searchText && <SearchTip />}
      
      {filteredFlows.length === 0 ? (
        <Empty 
          description={
            searchText ? `No flows found matching "${searchText}"` : "No flows available"
          }
        />
      ) : (
        <>
          <List
            dataSource={filteredFlows}
            renderItem={(flow) => (
              <List.Item>
                <Card
                  style={{ width: '100%' }}
                  title={
                    <Space align="center">
                      <Checkbox
                        checked={selectedFlows.includes(flow.id)}
                        onChange={(e) => onSelectFlow(flow.id, e.target.checked)}
                      />
                      <Title level={5} style={{ margin: 0 }}>
                        {flow.name}
                      </Title>
                      <Tag color={flow.status.color}>
                        {flow.status.label}
                      </Tag>
                    </Space>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {flow.description && (
                      <Text type="secondary">{flow.description}</Text>
                    )}
                    <Space>
                      <Text>Created: {flow.createdOn.toLocaleDateString()}</Text>
                      <Text>Modified: {flow.modifiedOn.toLocaleDateString()}</Text>
                    </Space>
                    <Space>
                      <Text>Owner: {flow.owner}</Text>
                    </Space>
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={() => onFlowSelect(flow)}
                      style={{ marginTop: 8 }}
                    >
                      Analyze Flow
                    </Button>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
          
          {/* Pagination controls */}
          <div className="flow-list-pagination" style={{ textAlign: 'right', marginTop: '20px' }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalCount}
              onChange={onPageChange}
              showSizeChanger
              pageSizeOptions={['10', '20', '50', '100']}
              showTotal={(total) => `Total ${total} flows`}
              disabled={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}; 