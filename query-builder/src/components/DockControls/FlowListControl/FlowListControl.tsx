import React, { useState } from 'react';
import { Tooltip, Button, message } from 'antd';
import './FlowListControl.css';

const FlowListControl: React.FC = () => {
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const handleLinkClick = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        // Display a success message using Antd's Message component
        message.success(`Copied ${label}`);
    };

    const openURL = (url: string) => {
        window.open(url, '_blank');
    };

    return (
        <div className="flowListControl">
            {/* Display the flow list links */}
            <Button onClick={() => handleLinkClick('fetchxml_content', 'FetchXML')}>FetchXML</Button>
            <Tooltip title="Tooltip for FetchXML">
                <Button onClick={() => openURL('https://example.com')}>Help</Button>
            </Tooltip>
            {/* ... Add other links and functionalities as needed ... */}
        </div>
    );
}

export default FlowListControl;
