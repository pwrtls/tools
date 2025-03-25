# Power Tools Development Guide

This guide outlines the process and best practices for building new Power Tools within the PowerTools UI framework. These tools allow Dynamics 365/Power Platform administrators and developers to enhance their productivity when working with the platform.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Setup Process](#setup-process)
- [Project Structure](#project-structure)
- [Accessing Microsoft Resources](#accessing-microsoft-resources)
- [Using Power Tools APIs](#using-power-tools-apis)
- [UI/UX Guidelines](#uiux-guidelines)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Deployment](#deployment)

## Architecture Overview

Power Tools are built as React applications that integrate with the PowerTools UI framework. The framework provides:

1. **Authentication** - Handles connections to Dynamics 365 / Power Platform environments
2. **Common UI components** - Provides consistent look and feel across tools
3. **API access** - Simplified methods for interacting with Dataverse
4. **Context management** - Environment and user context management

Each tool operates within this framework, focusing on a specific functionality while leveraging the shared infrastructure.

## Setup Process

### Prerequisites
- Node.js (LTS version recommended)
- npm or yarn
- Git

### Creating a New Tool

1. Create a new directory in the `tools` repository with your tool name:
   ```
   mkdir tools/your-tool-name
   ```

2. Initialize a new React project using create-react-app with TypeScript:
   ```
   npx create-react-app tools/your-tool-name --template typescript
   ```

3. Install required dependencies:
   ```
   cd tools/your-tool-name
   npm install antd dayjs @ant-design/icons
   ```

4. Set up the TypeScript configuration in `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "es5",
       "lib": ["dom", "dom.iterable", "esnext"],
       "allowJs": true,
       "skipLibCheck": true,
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "strict": true,
       "forceConsistentCasingInFileNames": true,
       "noFallthroughCasesInSwitch": true,
       "module": "esnext",
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx",
       "baseUrl": "src"
     },
     "include": ["src"]
   }
   ```

5. Set up the directory structure (see [Project Structure](#project-structure))

## Project Structure

Organize your project as follows:

```
your-tool-name/
├── public/
├── src/
│   ├── index.tsx              # Entry point
│   ├── AppRouter.tsx          # Routing configuration
│   ├── models/                # TypeScript interfaces and types
│   ├── views/                 # Main view components
│   ├── components/            # Reusable UI components
│   ├── api/                   # API service functions
│   ├── powertools/            # PowerTools integration
│   └── utils/                 # Utility functions
├── package.json
├── tsconfig.json
└── README.md
```

### Key Files

1. **index.tsx**
   ```tsx
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import { ConfigProvider, App } from 'antd';
   import { PowerToolsContextProvider } from 'powertools/PowerToolsContext';
   import AppRouter from './AppRouter';

   const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
   root.render(
     <React.StrictMode>
       <PowerToolsContextProvider>
         <ConfigProvider>
           <App>
             <AppRouter />
           </App>
         </ConfigProvider>
       </PowerToolsContextProvider>
     </React.StrictMode>
   );
   ```

2. **AppRouter.tsx**
   ```tsx
   import React from 'react';
   import { HashRouter, Routes, Route } from 'react-router-dom';
   import { PowerToolsContextProvider } from 'powertools/PowerToolsContext';
   import MainView from 'views/MainView';
   import DetailView from 'views/DetailView';

   const AppRouter: React.FC = () => {
     return (
       <HashRouter>
         <PowerToolsContextProvider>
           <Routes>
             <Route path="/" element={<MainView />} />
             <Route path="/details/:id" element={<DetailView />} />
           </Routes>
         </PowerToolsContextProvider>
       </HashRouter>
     );
   };

   export default AppRouter;
   ```

3. **PowerTools Integration (src/powertools/apiHook.ts)**
   ```tsx
   import { useState, useEffect, useContext } from 'react';
   import { PowerToolsContext } from './PowerToolsContext';

   export const usePowerToolsApi = () => {
     const context = useContext(PowerToolsContext);
     const [isLoaded, setIsLoaded] = useState(false);
     
     useEffect(() => {
       if (context.isInitialized) {
         setIsLoaded(true);
       }
     }, [context.isInitialized]);
     
     const getAsJson = async <T>(url: string, queryParams?: URLSearchParams): Promise<T> => {
       // Implementation
     };
     
     const get = async (url: string, queryParams?: URLSearchParams): Promise<Response> => {
       // Implementation
     };
     
     const post = async (url: string, data: any): Promise<Response> => {
       // Implementation
     };
     
     return {
       isLoaded,
       getAsJson,
       get,
       post,
       // Other methods as needed
     };
   };
   ```

## Accessing Microsoft Resources

When building tools that interact with Microsoft Dynamics 365 / Power Platform, always reference the official Microsoft documentation:

1. **Dataverse Web API Reference**: 
   - [Official Documentation](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/)
   - For entity schemas, relationships, and API calls

2. **Power Apps Component Framework**:
   - [Official Documentation](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview)
   - For building UI components for model-driven apps

3. **Power Automate API Reference**:
   - [Official Documentation](https://learn.microsoft.com/en-us/power-automate/flow-management-api)
   - For integrating with Power Automate flows

Always verify the entity structure and available fields by checking:

```typescript
// Example: Check structure of an entity
interface IEntityStructure {
  // Define properties based on Microsoft documentation
  // e.g., for Audit entity
  auditid: string;
  createdon: string;
  operation: number;
  _userid_value: string;
  // ...other fields
}
```

## Using Power Tools APIs

The Power Tools framework provides a standard way to interact with Dynamics 365 / Power Platform. Here's how to use them:

1. **Create an API Service**:

```typescript
// src/api/yourService.ts
import { usePowerToolsApi } from 'powertools/apiHook';
import { YourEntityType } from 'models/yourEntity';

export const useYourService = () => {
  const { getAsJson, post } = usePowerToolsApi();
  
  const fetchEntities = async (
    // parameters
  ) => {
    const query = new URLSearchParams();
    query.set('$select', 'field1,field2,field3');
    
    if (parameter1) {
      query.append('$filter', `field eq '${parameter1}'`);
    }
    
    try {
      const response = await getAsJson<YourResponseType>('/api/data/v9.0/yourentity', query);
      return response;
    } catch (error) {
      console.error('Error fetching entities:', error);
      return { value: [] };
    }
  };
  
  return {
    fetchEntities,
    // other functions
  };
};
```

2. **Use the Service in Components**:

```tsx
import { useYourService } from 'api/yourService';

const YourComponent = () => {
  const { fetchEntities } = useYourService();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      const result = await fetchEntities();
      setData(result.value);
    };
    
    loadData();
  }, []);
  
  return (
    // Your component rendering
  );
};
```

## UI/UX Guidelines

Follow these guidelines for a consistent user experience:

1. **Use Ant Design Components**:
   - Leverage the Ant Design component library for UI
   - Follow Ant Design patterns for forms, tables, and navigation

2. **Responsive Design**:
   - Ensure tools work on various screen sizes
   - Use Ant Design's grid system for layouts

3. **Error Handling**:
   - Provide clear error messages
   - Include fallback UI for error states
   - Log detailed errors to console for troubleshooting

4. **Loading States**:
   - Show loading indicators for async operations
   - Avoid UI jumps by using placeholders

5. **User Feedback**:
   - Confirm successful operations
   - Use notifications for important events

6. **Accessibility**:
   - Ensure proper contrast for text
   - Provide keyboard navigation
   - Use semantic HTML

## Testing

### Local Testing

1. Build and run your tool locally:
   ```
   npm start
   ```

2. Use the PowerTools development server for testing with a real Dynamics environment.

3. Test with the browser console open to catch errors.

### Test Cases

1. **Authentication** - Test with different user roles
2. **API Calls** - Verify data retrieval and error handling
3. **UI Components** - Test interaction patterns
4. **Edge Cases** - Test with empty data, large volumes, etc.

## Git Workflow

1. **Branch Organization**:
   - Use feature branches for new tools
   - Follow naming convention: `feature/tool-name`

2. **Commit Best Practices**:
   - Use clear commit messages with a prefix (feat, fix, docs, etc.)
   - Include context in commit descriptions

3. **Ignore Files**:
   - Use the root `.gitignore` for common patterns
   - Don't commit node_modules, build directories, or environment files

4. **Documentation Updates**:
   - Update README.md in your tool directory
   - Document API interactions and data models

## Deployment

Build your tool for production:
```
npm run build
```

The build artifacts will be stored in the `build/` directory, ready for deployment within the PowerTools UI framework.

## Further Resources

- [Ant Design Documentation](https://ant.design/components/overview)
- [React Router Documentation](https://reactrouter.com/docs/en/v6)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Microsoft Power Platform Documentation](https://learn.microsoft.com/en-us/power-platform/) 