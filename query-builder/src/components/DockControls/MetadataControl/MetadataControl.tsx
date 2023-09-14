import React from 'react';
import { Card, List } from 'antd';
import './MetadataControl.css';

interface MetadataItem {
    key: string;
    name: string;
    value: string;
}

const MetadataControl: React.FC = () => {
    // Sample metadata list for demonstration purposes
    const metadata: MetadataItem[] = [
        { key: '1', name: 'Entity', value: 'Account' },
        { key: '2', name: 'Attribute', value: 'Name' },
        // ... add more metadata items as needed
    ];

    return (
        <div className="metadataControl">
            <Card title="Metadata" bordered={false}>
                <List
                    itemLayout="horizontal"
                    dataSource={metadata}
                    renderItem={item => (
                        <List.Item>
                            <List.Item.Meta
                                title={item.name}
                                description={item.value}
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}

export default MetadataControl;
