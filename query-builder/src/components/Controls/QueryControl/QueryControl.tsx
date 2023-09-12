import React, { useState } from 'react';
import AceEditor from 'react-ace';
import { Select, Form, Tabs, Button } from 'antd';

import 'ace-builds/src-noconflict/theme-monokai'; // For the editor theme
import 'ace-builds/src-noconflict/mode-xml'; // For FetchXML
import 'ace-builds/src-noconflict/mode-sql'; // For SQL
import 'ace-builds/src-noconflict/mode-javascript'; // For JavaScript
import 'ace-builds/src-noconflict/mode-csharp'; // For C#

const { Option } = Select;
const { TabPane } = Tabs;

const QueryControl: React.FC = () => {
  const [mode, setMode] = useState<'manual' | 'ui'>('manual');
  const [query, setQuery] = useState<string>('');
  const [language, setLanguage] = useState<string>('xml'); // Default to FetchXML
  const [entity, setEntity] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);

  const handleEntityChange = (value: string) => {
    setEntity(value);
    // Fetch attributes for the selected entity
    // For demonstration purposes, we'll use a mock list
    const mockAttributes = ['name', 'email', 'phone'];
    setAttributes(mockAttributes);
  };

  return (
    <div className="query-control">
      <Tabs defaultActiveKey="manual" onChange={key => setMode(key as 'manual' | 'ui')}>
        <TabPane tab="Manual" key="manual">
          <Select defaultValue="xml" onChange={setLanguage} style={{ marginBottom: '10px' }}>
            <Option value="xml">FetchXML</Option>
            <Option value="sql">SQL</Option>
            <Option value="javascript">JavaScript</Option>
            <Option value="csharp">C#</Option>
            <Option value="odata">OData</Option>
          </Select>
          <AceEditor
            mode={language}
            theme="monokai"
            value={query}
            onChange={setQuery}
            name="queryEditor"
            editorProps={{ $blockScrolling: true }}
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            width="100%"
            height="400px"
          />
        </TabPane>
        <TabPane tab="UI Driven" key="ui">
          <Form layout="vertical">
            <Form.Item label="Entity">
              <Select placeholder="Select an entity" onChange={handleEntityChange}>
                {/* Options can be dynamically populated based on available entities */}
                <Option value="account">Account</Option>
                <Option value="contact">Contact</Option>
                {/* ... */}
              </Select>
            </Form.Item>
            <Form.Item label="Attributes">
              <Select mode="multiple" placeholder="Select attributes" value={attributes}>
                {/* Options can be dynamically populated based on the selected entity's attributes */}
                <Option value="name">Name</Option>
                <Option value="email">Email</Option>
                {/* ... */}
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
      <Button type="primary" style={{ marginTop: '10px' }}>
        Execute Query
      </Button>
    </div>
  );
};

export default QueryControl;
