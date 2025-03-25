/**
 * This file provides a mock implementation of the PowerTools API for local development.
 * Include this file in your index.tsx for local testing without the actual PowerTools environment.
 */

// Sample audit log data for testing
const mockAuditLogs = Array(20).fill(null).map((_, index) => ({
  auditid: `audit-${index}`,
  createdon: new Date(Date.now() - index * 3600000).toISOString(),
  operation: index % 5 + 1,
  operation_formatted: ['Create', 'Update', 'Delete', 'Access', 'Assign'][index % 5],
  userid: `user-${index % 3}`,
  action: 1,
  objectid: `record-${index}`,
  objecttypecode: `entity-${index % 4}`,
  attributemask: 'some-mask',
  _userid_value: `system-user-${index % 3}`,
}));

const mockAuditDetails = [
  {
    auditdetailid: 'detail-1',
    auditid: 'audit-1',
    attributemask: 'some-mask',
    attributename: 'name',
    oldvalue: 'Old Value',
    newvalue: 'New Value'
  },
  {
    auditdetailid: 'detail-2',
    auditid: 'audit-1',
    attributemask: 'some-mask',
    attributename: 'status',
    oldvalue: 'Draft',
    newvalue: 'Published'
  }
];

// Helper function to create a consistent IHttpResult object
const createHttpResult = <T>(data: T): IHttpResult => ({
  headers: {},
  statusCode: 200,
  contentLength: 0,
  content: '',
  asJson: () => Promise.resolve(data) as Promise<any>,
  asCsv: () => Promise.resolve(''),
  asText: () => Promise.resolve(''),
  getSkipToken: () => Promise.resolve('')
});

// Check if we're running inside PowerToolsUI sandbox
const isInPowerToolsUI = () => {
  // Check if we're loaded in an iframe (likely PowerToolsUI)
  const isInIframe = window !== window.top;
  
  // Check URL params for PowerToolsUI test tool markers
  const urlParams = new URLSearchParams(window.location.search);
  const hasFrameUrlParam = urlParams.has('frameUrl');
  
  return isInIframe || hasFrameUrlParam;
};

export const setupMockPowerTools = () => {
  // Extra safety checks to prevent overriding real PowerTools
  if (typeof window.PowerTools !== 'undefined') {
    console.log('PowerTools API already exists, not setting up mock');
    return;
  }
  
  if (isInPowerToolsUI()) {
    console.log('Detected PowerToolsUI environment, not setting up mock');
    return;
  }
  
  console.log('Setting up mock PowerTools for local development');
  
  window.PowerTools = {
    version: '1.0.0',
    isLoaded: () => true,
    onLoad: () => Promise.resolve(),
    addConnectionChangeListener: (listener) => listener('Mock Connection'),
    get: (url, query, headers) => {
      console.log('Mock API GET:', url, query?.toString());
      
      // Simulate audit logs endpoint
      if (url.includes('/api/data/v9.0/audits')) {
        return Promise.resolve(createHttpResult({
          '@odata.context': 'https://mock.crm.dynamics.com/api/data/v9.0',
          '@odata.count': mockAuditLogs.length,
          value: mockAuditLogs
        }));
      }
      
      // Simulate audit details endpoint
      if (url.includes('/api/data/v9.0/auditdetails')) {
        return Promise.resolve(createHttpResult({
          '@odata.context': 'https://mock.crm.dynamics.com/api/data/v9.0',
          value: mockAuditDetails
        }));
      }
      
      return Promise.resolve(createHttpResult({ value: [] }));
    },
    post: (url, body, headers) => {
      console.log('Mock API POST:', url, body);
      return Promise.resolve(createHttpResult({}));
    },
    download: (data, fileName, mimeType) => {
      console.log(`Mock download: ${fileName}`);
      
      // Create a blob and trigger download
      const blob = new Blob([data], { type: mimeType || 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return Promise.resolve();
    }
  };
}; 