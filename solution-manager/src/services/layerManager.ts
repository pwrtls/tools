import { ILayerInfo, ILayerOperation, ILayerComparison, ILayerDifference } from '../models/solutionLayers';

export class SolutionLayerManager {
    constructor(private powerTools: any) {}

    async getActiveLayer(componentId: string, componentType: number): Promise<ILayerInfo> {
        const res = await this.powerTools.get(`/api/data/v9.2/RetrieveActiveLayer(ComponentId=${componentId},ComponentType=${componentType})`);
        return await res.asJson();
    }

    async getActiveLayers(componentId: string, componentType: number): Promise<ILayerInfo[]> {
        const res = await this.powerTools.get(`/api/data/v9.2/RetrieveActiveLayers(ComponentId=${componentId},ComponentType=${componentType})`);
        return (await res.asJson()).Layers;
    }

    async getComponentLayers(componentId: string, componentType: number): Promise<{
        activeLayer: ILayerInfo;
        allLayers: ILayerInfo[];
    }> {
        const [activeLayer, allLayers] = await Promise.all([
            this.getActiveLayer(componentId, componentType),
            this.getActiveLayers(componentId, componentType)
        ]);

        return { activeLayer, allLayers };
    }

    async compareLayerDifferences(options: ILayerComparison): Promise<ILayerDifference[]> {
        const res = await this.powerTools.post('/api/data/v9.2/RetrieveLayerDifferences', options);
        return (await res.asJson()).Differences;
    }

    async promoteLayer(options: ILayerOperation): Promise<void> {
        await this.powerTools.post('/api/data/v9.2/PromoteLayer', options);
    }

    async revertLayer(options: ILayerOperation): Promise<void> {
        await this.powerTools.post('/api/data/v9.2/RevertLayer', options);
    }
} 