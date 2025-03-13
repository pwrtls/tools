import React, { useEffect, useState } from 'react';
import { Card, Space, Alert, Table, Button, message } from 'antd';
import { usePowerToolsApi } from '../powertools/apiHook';
import { SolutionLayerManager } from '../services/layerManager';
import { ILayerInfo, ILayerDifference, getLayerTypeName, getDifferenceTypeName } from '../models/solutionLayers';

interface ILayerManagementProps {
    componentId: string;
    componentType: number;
    solutionId: string;
}

export const LayerManagement: React.FC<ILayerManagementProps> = ({
    componentId,
    componentType,
    solutionId
}) => {
    const { get, post } = usePowerToolsApi();
    const [layers, setLayers] = useState<ILayerInfo[]>([]);
    const [activeLayer, setActiveLayer] = useState<ILayerInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [comparing, setComparing] = useState(false);
    const [differences, setDifferences] = useState<ILayerDifference[]>([]);

    useEffect(() => {
        const loadLayers = async () => {
            if (!get || !post) return;

            setLoading(true);
            try {
                const layerManager = new SolutionLayerManager({ get, post });
                const { activeLayer, allLayers } = await layerManager.getComponentLayers(
                    componentId,
                    componentType
                );
                setActiveLayer(activeLayer);
                setLayers(allLayers);
            } catch (error) {
                message.error('Failed to load layers');
                console.error('Failed to load layers:', error);
            } finally {
                setLoading(false);
            }
        };
        loadLayers();
    }, [componentId, componentType, get, post]);

    const handleCompareLayers = async (layer1Id: string, layer2Id: string) => {
        if (!get || !post) return;

        setComparing(true);
        try {
            const layerManager = new SolutionLayerManager({ get, post });
            const diffs = await layerManager.compareLayerDifferences({
                ComponentType: componentType,
                ObjectId: componentId,
                Layer1Id: layer1Id,
                Layer2Id: layer2Id
            });
            setDifferences(diffs);
        } catch (error) {
            message.error('Failed to compare layers');
            console.error('Failed to compare layers:', error);
        } finally {
            setComparing(false);
        }
    };

    const handlePromoteLayer = async () => {
        if (!get || !post) return;

        try {
            const layerManager = new SolutionLayerManager({ get, post });
            await layerManager.promoteLayer({
                ComponentType: componentType,
                ObjectId: componentId,
                SolutionId: solutionId
            });
            message.success('Layer promoted successfully');
            
            // Refresh layers after promotion
            const { activeLayer: newActiveLayer, allLayers: newLayers } = 
                await layerManager.getComponentLayers(componentId, componentType);
            setActiveLayer(newActiveLayer);
            setLayers(newLayers);
        } catch (error) {
            message.error('Failed to promote layer');
            console.error('Failed to promote layer:', error);
        }
    };

    const handleRevertLayer = async () => {
        if (!get || !post) return;

        try {
            const layerManager = new SolutionLayerManager({ get, post });
            await layerManager.revertLayer({
                ComponentType: componentType,
                ObjectId: componentId,
                SolutionId: solutionId
            });
            message.success('Layer reverted successfully');
            
            // Refresh layers after reversion
            const { activeLayer: newActiveLayer, allLayers: newLayers } = 
                await layerManager.getComponentLayers(componentId, componentType);
            setActiveLayer(newActiveLayer);
            setLayers(newLayers);
        } catch (error) {
            message.error('Failed to revert layer');
            console.error('Failed to revert layer:', error);
        }
    };

    return (
        <Card title="Layer Management" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                    message={`Active Layer: ${activeLayer?.LayerName || 'None'}`}
                    type="info"
                />
                
                <Table
                    dataSource={layers}
                    rowKey="LayerId"
                    columns={[
                        {
                            title: 'Layer Name',
                            dataIndex: 'LayerName',
                            key: 'layerName'
                        },
                        {
                            title: 'Layer Type',
                            dataIndex: 'LayerType',
                            key: 'layerType',
                            render: (type) => getLayerTypeName(type)
                        },
                        {
                            title: 'Actions',
                            key: 'actions',
                            render: (_, record) => (
                                <Space>
                                    <Button
                                        onClick={() => handleCompareLayers(
                                            activeLayer?.LayerId || '',
                                            record.LayerId
                                        )}
                                        loading={comparing}
                                        disabled={!activeLayer || record.LayerId === activeLayer.LayerId}
                                    >
                                        Compare with Active
                                    </Button>
                                </Space>
                            )
                        }
                    ]}
                />

                {differences.length > 0 && (
                    <Table
                        title={() => 'Layer Differences'}
                        dataSource={differences}
                        rowKey="AttributeName"
                        columns={[
                            {
                                title: 'Attribute',
                                dataIndex: 'AttributeName',
                                key: 'attribute'
                            },
                            {
                                title: 'Layer 1 Value',
                                dataIndex: 'Layer1Value',
                                key: 'layer1',
                                render: (value) => JSON.stringify(value)
                            },
                            {
                                title: 'Layer 2 Value',
                                dataIndex: 'Layer2Value',
                                key: 'layer2',
                                render: (value) => JSON.stringify(value)
                            },
                            {
                                title: 'Change Type',
                                dataIndex: 'DifferenceType',
                                key: 'changeType',
                                render: (type) => getDifferenceTypeName(type)
                            }
                        ]}
                    />
                )}

                <Space>
                    <Button 
                        type="primary" 
                        onClick={handlePromoteLayer}
                        disabled={!activeLayer}
                    >
                        Promote Layer
                    </Button>
                    <Button 
                        danger 
                        onClick={handleRevertLayer}
                        disabled={!activeLayer}
                    >
                        Revert Layer
                    </Button>
                </Space>
            </Space>
        </Card>
    );
}; 