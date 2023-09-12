import React, { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import './ODataControl.css';

const ODataControl: React.FC = () => {
    const [odataUrl, setOdataUrl] = useState<string>(''); // Sample initial value for demonstration purposes

    const handleExecuteOData = () => {
        window.open(odataUrl, '_blank');
        // Log usage
        console.log(`Executed OData URL: ${odataUrl}`);
    };

    const handleCopyOData = () => {
        navigator.clipboard.writeText(odataUrl);
        message.success('OData URL copied to clipboard!');
        // Log usage
        console.log(`Copied OData URL: ${odataUrl}`);
    };

    return (
        <div className="oDataControl">
            <Tooltip title="Click to execute OData URL">
                <Button type="link" onClick={handleExecuteOData}>{odataUrl}</Button>
            </Tooltip>
            <Button onClick={handleCopyOData}>Copy OData URL</Button>
        </div>
    );
}

export default ODataControl;