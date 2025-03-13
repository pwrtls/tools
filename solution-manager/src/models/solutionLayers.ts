export interface ILayerInfo {
    LayerId: string;
    LayerName: string;
    LayerType: number; // 0: Solution, 1: System, 2: Publisher, etc.
    SolutionId?: string;
    ComponentType: number;
    ObjectId: string;
    ManagedLayerId?: string;
}

export interface ILayerOperation {
    ComponentType: number;
    ObjectId: string;
    SolutionId: string;
}

export interface ILayerComparison {
    ComponentType: number;
    ObjectId: string;
    Layer1Id: string;
    Layer2Id: string;
}

export interface ILayerDifference {
    AttributeName: string;
    Layer1Value: any;
    Layer2Value: any;
    DifferenceType: number; // 1: Added, 2: Modified, 3: Deleted
}

export const LayerTypeNames: Record<number, string> = {
    0: 'Solution',
    1: 'System',
    2: 'Publisher',
    3: 'Customer',
};

export const DifferenceTypeNames: Record<number, string> = {
    1: 'Added',
    2: 'Modified',
    3: 'Deleted',
};

export const getLayerTypeName = (type: number): string => {
    return LayerTypeNames[type] || `Unknown (${type})`;
};

export const getDifferenceTypeName = (type: number): string => {
    return DifferenceTypeNames[type] || `Unknown (${type})`;
}; 