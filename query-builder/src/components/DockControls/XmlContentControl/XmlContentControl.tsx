import React, { useState } from 'react';
import { Card, Button, Input, message} from 'antd';
import './XmlContentControl.css';

const XmlContentControl: React.FC = () => {
    const [xmlContent, setXmlContent] = useState<string>(''); // Sample initial value for demonstration purposes

    const handleCopyXml = () => {
        navigator.clipboard.writeText(xmlContent);
        // Display a success message using Antd's message component
        message.success('XML content copied to clipboard!');
    };

    return (
        <div className="xmlContentControl">
            <Card title="XML Content" bordered={false}>
                <Input.TextArea value={xmlContent} readOnly />
                <Button onClick={handleCopyXml}>Copy XML Content</Button>
            </Card>
        </div>
    );
}

export default XmlContentControl;
