import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from './App';

// Mock the PowerTools API for testing
Object.defineProperty(window, 'PowerTools', {
  value: {
    version: '1.0.0',
    isLoaded: () => true,
    onLoad: () => Promise.resolve(),
    get: jest.fn().mockResolvedValue({ value: [] }),
    post: jest.fn().mockResolvedValue({}),
    download: jest.fn().mockResolvedValue(undefined),
    addConnectionChangeListener: (callback: (name: string | undefined) => void) => {
      // Simulate a connection being available
      setTimeout(() => callback('test-connection'), 0);
    }
  },
  writable: true
});

test('renders app without crashing', () => {
  // Just test that the app renders without throwing an error
  expect(() => render(<App />)).not.toThrow();
});
