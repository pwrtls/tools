import React, { useState, useEffect } from 'react';
import { Select, Form } from 'antd';

const { Option } = Select;

const EntityControl: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entities, setEntities] = useState<string[]>([]); // This can be fetched from the API or passed as props

  useEffect(() => {
    // Fetch the list of entities using window.PowerTools.get or any other method
    // For demonstration purposes, we'll use a mock list
    const mockEntities = ['Account', 'Contact', 'Lead', 'Opportunity'];
    setEntities(mockEntities);
  }, []);

  const handleEntityChange = (value: string) => {
    setSelectedEntity(value);
  };

  return (
    <div className="entity-control">
      <Form layout="vertical">
        <Form.Item label="Select Entity">
          <Select
            placeholder="Choose an entity"
            value={selectedEntity || undefined}
            onChange={handleEntityChange}
          >
            {entities.map(entity => (
              <Option key={entity} value={entity}>
                {entity}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EntityControl;
