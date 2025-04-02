# Flow Analyzer Development Guide

This document provides guidelines for developers contributing to the Power Automate Flow Analyzer & Documenter tool.

## Architecture Overview

The Flow Analyzer is built as a React application intended to run within the PowerTools UI framework. This framework provides the authenticated connection to Power Platform environments, allowing the tool to interact with the Microsoft Dataverse API.

### Key Components

1. **FlowList**: Displays a list of available flows in the current environment
2. **FlowVisualizer**: Renders a visual representation of the flow using Mermaid.js
3. **FlowAnalyzer**: Analyzes flow structure, detects issues, and generates recommendations
4. **DocumentGenerator**: Creates documentation in various formats (Markdown, PDF, Text)

### Data Flow

1. User selects a Power Platform environment in PowerTools
2. Flow List component loads flows from the Dataverse API
3. User selects a flow to analyze
4. System loads flow details and performs analysis
5. Results are displayed in the UI and can be exported

## Development Environment Setup

### Prerequisites

- Node.js 16+ and npm/yarn
- Visual Studio Code (recommended)
- PowerTools UI Framework access

### Installation

1. Clone the repository
2. Navigate to the `flowchart` directory
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```

### Development Mode

During development, you can toggle the `USE_MOCK_DATA` flag in `src/api/flowService.ts` to use mock data instead of real API calls. This allows for development without requiring connection to a real Power Platform environment.

## API Integration

The Flow Analyzer uses the Microsoft Dataverse Web API to interact with Power Automate flows. Key endpoints include:

- `/api/data/v9.2/workflows` - List available flows
- `/api/data/v9.2/workflows({id})` - Get details for a specific flow

The API integration is handled through the PowerTools API interface, which provides an authenticated connection to the Dataverse API.

### Flow Structure

Power Automate flows are stored in the Dataverse `workflow` table. When working with flows:

- Flows with `category = 5` are Cloud Flows (Automated, Instant, or Scheduled)
- Flow definition is stored in the `clientdata` field as JSON
- The definition contains:
  - Connection references
  - Triggers
  - Actions
  - Parameters

## Component Development Guidelines

### Creating New Components

1. Create a new TypeScript file in `src/components`
2. Define your component using functional components and hooks
3. Define prop types with TypeScript interfaces
4. Export the component

Example:
```tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  data: any[];
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, data }) => {
  return (
    <div>
      <h3>{title}</h3>
      {/* Component implementation */}
    </div>
  );
};
```

### State Management

- Use React hooks for local component state
- For shared state, use React Context or a state management library
- The FlowContext provides access to the selected flow and analysis results

### API Interactions

- All API calls should go through the `flowService.ts` module
- Use the `usePowerToolsApi` hook for custom API calls
- Handle loading states and errors appropriately

## Testing

### Running Tests

```
npm test
```

### Testing Guidelines

1. Write unit tests for utility functions
2. Write component tests for key UI elements
3. Use mock data for testing API interactions
4. Test edge cases and error states

## Build and Deployment

### Building for Production

```
npm run build
```

This creates optimized production build in the `build` directory, which can be loaded into the PowerTools framework.

### Deployment Process

1. Build the application
2. Package the `build` directory
3. Import the package into PowerTools

## Troubleshooting

### Common Issues

1. **API Connection Errors**: Verify PowerTools is properly authenticated to the Power Platform environment
2. **Type Errors**: Ensure TypeScript interfaces match the actual API responses
3. **UI Rendering Issues**: Check browser console for errors

### Debugging Tips

- Use browser developer tools for inspecting network requests
- Toggle `USE_MOCK_DATA` to isolate API issues
- Add console.log statements for debugging complex logic

## Contributing Guidelines

1. Create a feature branch for new work
2. Follow the existing code style and patterns
3. Add appropriate tests
4. Update documentation
5. Submit a pull request

## Additional Resources

- [Microsoft Dataverse Web API Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
- [Power Automate Management API](https://learn.microsoft.com/en-us/power-automate/manage-flows-with-code)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Mermaid.js Documentation](https://mermaid-js.github.io/mermaid/#/) 