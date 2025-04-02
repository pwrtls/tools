/**
 * This file provides a mock implementation of the PowerTools API for local development.
 * It can be imported in index.tsx for local testing without the actual PowerTools environment.
 */
import { mockFlowsResponse, mockFlowDefinition } from '../mock/flowData';

// Helper function to create a consistent PowerToolsResponse object
const createResponse = <T>(data: T): {
  asJson<R>(): Promise<R>;
  text(): Promise<string>;
  getSkipToken?(): Promise<string>;
} => ({
  asJson: <R>() => Promise.resolve(data as unknown as R),
  text: () => Promise.resolve(JSON.stringify(data)),
  getSkipToken: () => Promise.resolve('')
});

// Check if we're running inside PowerToolsUI
const isInPowerToolsUI = () => {
  // Check if we're loaded in an iframe (likely PowerToolsUI)
  const isInIframe = window.self !== window.top;
  
  // Check URL params for PowerToolsUI markers
  const urlParams = new URLSearchParams(window.location.search);
  const hasFrameUrlParam = urlParams.has('frameUrl');
  
  return isInIframe || hasFrameUrlParam;
};

/**
 * Set up mock PowerTools API for local development
 * Only use this in development mode and when not running in PowerToolsUI
 */
export const setupMockPowerTools = () => {
  // Only set up mock in development
  if (process.env.NODE_ENV !== 'development') {
    console.log('Not setting up mock PowerTools in production');
    return;
  }

  // Don't override real PowerTools
  if (typeof window.PowerTools !== 'undefined') {
    console.log('PowerTools API already exists, not setting up mock');
    return;
  }
  
  // Don't set up mock if running in PowerToolsUI environment
  if (isInPowerToolsUI()) {
    console.log('Detected PowerToolsUI environment, not setting up mock');
    return;
  }
  
  console.log('Setting up mock PowerTools for local development');
  
  window.PowerTools = {
    version: '1.0.0-mock',
    isLoaded: () => true,
    onLoad: () => Promise.resolve(),
    addConnectionChangeListener: (listener) => setTimeout(() => listener('Mock Connection'), 500),
    get: (url, query, headers) => {
      console.log('Mock API GET:', url, query?.toString());
      
      // Mock flow list endpoint
      if (url.includes('/api/flows')) {
        return Promise.resolve(createResponse(mockFlowsResponse));
      }
      
      // Mock flow details endpoint - extract flow ID from URL
      if (url.match(/\/api\/flows\/[^\/]+$/)) {
        return Promise.resolve(createResponse(mockFlowDefinition));
      }
      
      return Promise.resolve(createResponse({ value: [] }));
    },
    post: (url, body, headers) => {
      console.log('Mock API POST:', url, body);
      return Promise.resolve(createResponse({}));
    },
    download: (data, fileName, mimeType) => {
      console.log(`Mock download: ${fileName}`);
      
      // Create a blob and trigger download
      const blob = new Blob([data], { type: mimeType || 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return Promise.resolve();
    }
  };
}; 