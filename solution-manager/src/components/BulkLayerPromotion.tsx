import React, { useState } from 'react';
import { Button, Modal, Progress, Space, message } from 'antd';
import { usePowerToolsApi } from '../powertools/apiHook';
import { SolutionLayerManager } from '../services/layerManager';
import { ISolutionComponentSummary } from '../models/solutionComponentSummary';

interface IBulkLayerPromotionProps {
    solutionId: string;
    components: ISolutionComponentSummary[];
    onComplete?: () => void;
}

export const BulkLayerPromotion: React.FC<IBulkLayerPromotionProps> = ({
    solutionId,
    components,
    onComplete
}) => {
    const { get, post } = usePowerToolsApi();
    const [isPromoting, setIsPromoting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentComponent, setCurrentComponent] = useState<string>('');
    const [operationLog, setOperationLog] = useState<string[]>([]);

    const handlePromoteAllLayers = async () => {
        if (!get || !post || components.length === 0) return;

        setIsPromoting(true);
        setProgress(0);
        setOperationLog([]);

        const layerManager = new SolutionLayerManager({ get, post });
        const totalComponents = components.length;
        let successCount = 0;
        let failureCount = 0;

        try {
            for (let i = 0; i < components.length; i++) {
                const component = components[i];
                setCurrentComponent(component.msdyn_name || 'Unknown Component');

                try {
                    await layerManager.promoteLayer({
                        ComponentType: component.msdyn_componenttype,
                        ObjectId: component.msdyn_objectid,
                        SolutionId: solutionId
                    });
                    successCount++;
                    setOperationLog(prev => [...prev, `✅ Successfully promoted ${component.msdyn_name}`]);
                } catch (error) {
                    failureCount++;
                    setOperationLog(prev => [...prev, `❌ Failed to promote ${component.msdyn_name}: ${error}`]);
                    console.error(`Failed to promote component ${component.msdyn_name}:`, error);
                }

                setProgress(Math.round(((i + 1) / totalComponents) * 100));
            }

            if (successCount === totalComponents) {
                message.success('Successfully promoted all components');
            } else {
                message.warning(`Promoted ${successCount} components, ${failureCount} failed`);
            }
        } catch (error) {
            console.error('Bulk promotion failed:', error);
            message.error('Failed to complete bulk promotion');
        } finally {
            setIsPromoting(false);
            if (onComplete) {
                onComplete();
            }
        }
    };

    return (
        <>
            <Button
                type="primary"
                onClick={handlePromoteAllLayers}
                loading={isPromoting}
                disabled={components.length === 0}
            >
                Promote All Components
            </Button>

            <Modal
                title="Promoting Solution Components"
                open={isPromoting}
                footer={null}
                closable={false}
                width={600}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Progress percent={progress} status="active" />
                    <div>Current component: {currentComponent}</div>
                    <div style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        border: '1px solid #d9d9d9',
                        padding: '8px',
                        borderRadius: '4px'
                    }}>
                        {operationLog.map((log, index) => (
                            <div key={index}>{log}</div>
                        ))}
                    </div>
                </Space>
            </Modal>
        </>
    );
}; 