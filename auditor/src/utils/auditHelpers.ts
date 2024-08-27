export function getOperationName(operation: number): string {
    const operations: { [key: number]: string } = {
        1: 'Create', 2: 'Update', 3: 'Delete', 4: 'Access', 5: 'Upsert',
        115: 'Archive', 116: 'Retain', 117: 'RollbackRetain', 118: 'Restore', 200: 'CustomOperation'
    };
    return operations[operation] || `Unknown (${operation})`;
}

export function getActionName(action: number): string {
    const actions: { [key: number]: string } = {
        0: 'Unknown', 1: 'Create', 2: 'Update', 3: 'Delete', 4: 'Activate',
        5: 'Deactivate', 11: 'Cascade', 12: 'Merge', 13: 'Assign', 14: 'Share',
        15: 'Retrieve', 16: 'Close', 17: 'Cancel', 18: 'Complete', 20: 'Resolve',
    };
    return actions[action] || `Unknown (${action})`;
}