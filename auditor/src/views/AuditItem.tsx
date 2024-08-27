import React from 'react';
import { List, Typography } from 'antd';
import { IFormattedAuditRecord } from 'models/auditRecord';

const { Text } = Typography;

interface AuditItemProps {
    audit: IFormattedAuditRecord;
    onClick: () => void;
}

export const AuditItem: React.FC<AuditItemProps> = ({ audit, onClick }) => {
    return (
        <List.Item onClick={onClick} style={{ cursor: 'pointer' }}>
            <List.Item.Meta
                title={`${audit.action} - ${audit.operation}`}
                description={
                    <>
                        <Text>Version: {audit.versionnumber}</Text>
                        <br />
                        <Text>Created On: {audit.createdon}</Text>
                        <br />
                        <Text>User ID: {audit._userid_value}</Text>
                    </>
                }
            />
        </List.Item>
    );
};