import React from 'react';
import { List, Card, Typography, Space, Tag, Button, Empty, Checkbox } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Flow } from '../models/Flow';

const { Title, Text } = Typography;

interface FlowListProps {
  onFlowSelect: (flow: Flow) => void;
  searchText: string;
  filteredFlows: Flow[];
  selectedFlows: string[];
  onSelectFlow: (id: string, isSelected: boolean) => void;
  loading: boolean;
}

export const FlowList: React.FC<FlowListProps> = ({ 
  onFlowSelect, 
  searchText, 
  filteredFlows, 
  selectedFlows, 
  onSelectFlow,
  loading 
}) => {
  if (loading) {
    return (
      <div className="flow-list-loading">
        <List loading={true} dataSource={[]} renderItem={() => <></>} />
      </div>
    );
  }

  return (
    <div className="flow-list-container">
      {filteredFlows.length === 0 ? (
        <Empty 
          description={
            searchText ? `No flows found matching "${searchText}"` : "No flows available"
          }
        />
      ) : (
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
      )}
    </div>
  );
}; 