import React, { useState } from 'react';
import { Select, Button, Form } from 'antd';

const { Option } = Select;

const AttributeControl: React.FC = () => {
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]); // This can be fetched or passed as props

  const handleAttributeChange = (value: string) => {
    setSelectedAttribute(value);
  };

  const handleApply = () => {
    // Logic to apply the selected attribute to the FetchXML
  };

  return (
    <div className="attribute-control">
      <Form layout="vertical">
        <Form.Item label="Select Attribute">
          <Select
            placeholder="Choose an attribute"
            value={selectedAttribute || undefined}
            onChange={handleAttributeChange}
          >
            {attributes.map(attr => (
              <Option key={attr} value={attr}>
                {attr}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleApply}>
            Apply
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AttributeControl;
