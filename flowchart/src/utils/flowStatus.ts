export interface FlowStatusInfo {
  label: string;
  color: string;
}

export function getFlowStatus(statecode: number): FlowStatusInfo {
  switch (statecode) {
    case 0: return { label: 'Draft', color: '#FFA500' }; // Orange for Draft
    case 1: return { label: 'Activated', color: '#4CAF50' }; // Green for Activated
    case 2: return { label: 'Suspended', color: '#FF0000' }; // Red for Suspended
    default: return { label: 'Unknown', color: '#808080' }; // Gray for Unknown
  }
}

export function getFlowStatusReason(statuscode?: number): string {
  if (!statuscode) return 'Unknown';
  
  switch (statuscode) {
    case 1: return 'Draft';
    case 2: return 'Activated';
    case 3: return 'CompanyDLPViolation';
    default: return 'Unknown';
  }
}

// Helper function to determine if a flow is active
export function isFlowActive(statecode: number): boolean {
  return statecode === 1; // 1 = Activated
} 