import React, { useState, useCallback, useEffect } from 'react';
import { Button, Progress, message, Modal, Space, Typography } from 'antd';
import { PowerToolsContext } from '../powertools/context';

const { Text } = Typography;

interface Component {
    objectid: string;
    componenttype: number;
}

export const SolutionCopy: React.FC<{ sourceSolutionId: string, targetSolutionId: string }> = ({ sourceSolutionId, targetSolutionId }) => {
    console.log('SolutionCopy component rendering', { sourceSolutionId, targetSolutionId });
    const [copying, setCopying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const { post } = React.useContext(PowerToolsContext);

    console.log('SolutionCopy rendered', { sourceSolutionId, targetSolutionId, post: !!post });

    const addDebugInfo = useCallback((info: string) => {
        setDebugInfo(prev => [...prev, info]);
        console.log("Debug:", info);
    }, []);

    useEffect(() => {
        console.log("Copying state changed:", copying);
    }, [copying]);

    useEffect(() => {
        console.log('SolutionCopy component mounted');
    }, []);

    const handleCopy = useCallback(async () => {
        console.log("Copy to Solution button clicked", { sourceSolutionId, targetSolutionId });
        
        if (!post) {
            console.log("PowerTools post function is not available");
            message.error('PowerTools post function is not available');
            return;
        }

        console.log("Copy process started");
        setCopying(true);
        setProgress(0);
        setDebugInfo(['Starting copy process']);

        try {
            addDebugInfo("Retrieving solution components");
            const result = await post('RetrieveSolutionComponents', {
                SolutionId: sourceSolutionId
            });

            console.log("RetrieveSolutionComponents result:", result);

            const components = Array.isArray(result) ? result : [];
            
            if (components.length === 0) {
                throw new Error('No components found in the source solution');
            }

            addDebugInfo(`Found ${components.length} components`);

            const totalComponents = components.length;
            let copiedComponents = 0;

            for (const component of components) {
                try {
                    
                    await post('AddSolutionComponent', {
                        SolutionId: targetSolutionId,
                        ComponentId: component.objectid,
                        ComponentType: component.componenttype,
                        AddRequiredComponents: true
                    });

                    copiedComponents++;
                    const newProgress = Math.round((copiedComponents / totalComponents) * 100);
                    setProgress(newProgress);
                    
                    console.log(`Copied component: ${component.objectid}, Type: ${component.componenttype}, Progress: ${newProgress}%`);
                    
                    addDebugInfo(`Copied component ${copiedComponents}/${totalComponents}`);
                } catch (error) {
                    console.error(`Failed to copy component: ${component.objectid}`, error);
                    addDebugInfo(`Failed to copy component: ${component.objectid}`);
                }
            }

            message.success('Components copied successfully');
            addDebugInfo('Copy process completed successfully');
        } catch (error: unknown) {
            console.error('Failed to copy components', error);
            message.error('Failed to copy components');
            addDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            console.log("Copy process ended");
            setCopying(false);
        }
    }, [post, sourceSolutionId, targetSolutionId, addDebugInfo]);

    return (
        <div>
            <p>SolutionCopy Component</p>
            <Button onClick={handleCopy} loading={copying} disabled={!post}>
                Copy Solution Components
            </Button>
            {copying && (
                <div style={{ marginTop: '20px' }}>
                    <Progress percent={progress} status="active" />
                    <Text>Progress: {progress}%</Text>
                </div>
            )}
            <Modal
                title="Copying Solution Components"
                open={copying}
                footer={null}
                closable={false}
                maskClosable={false}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Progress percent={progress} status="active" />
                    <Text>Progress: {progress}%</Text>
                    <Text>Debug Info:</Text>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {debugInfo.map((info, index) => (
                            <div key={index}>
                                <Text>{info}</Text>
                            </div>
                        ))}
                    </div>
                </Space>
            </Modal>
        </div>
    );
};