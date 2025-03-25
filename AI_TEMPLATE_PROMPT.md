# AI Template Prompt for Power Tools Development

Use this template prompt when asking an AI assistant to help with developing or enhancing Power Tools in this repository.

## Template Prompt

```
I'm working on a Power Tool for the PowerTools UI framework that integrates with Microsoft Dynamics 365 / Power Platform. This tool will [DESCRIBE PURPOSE OF THE TOOL].

The PowerTools UI framework provides authentication, common UI components, API access, and context management for tools that enhance Dynamics 365/Power Platform administration and development.

Here's the context you need:

### Repository Structure
The tools repository contains multiple Power Tools, each focused on specific functionality:
- power-audit: Audit log viewer for tracking changes in Dynamics 365
- solution-manager: Manages solution components and deployments
- [OTHER TOOLS IN THE REPOSITORY]

### Microsoft Resources
This tool interacts with the following Microsoft Dynamics 365 / Power Platform resources:
- Entity/Table: [ENTITY NAME] - [BRIEF DESCRIPTION]
- API Endpoint: [API ENDPOINT] - [WHAT IT DOES]
- Documentation Reference: [LINK TO MICROSOFT DOCS]

Please refer to the official Microsoft documentation at https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/ when working with entities and API calls.

### Technical Stack
- React [VERSION]
- TypeScript
- Ant Design [VERSION]
- PowerTools UI framework

### Project Structure Guidelines
The tool should follow the established pattern:
- src/
  |- index.tsx - Entry point
  |- AppRouter.tsx - Routing configuration
  |- models/ - TypeScript interfaces
  |- views/ - Main view components
  |- components/ - Reusable UI components
  |- api/ - API service functions
  |- powertools/ - Framework integration
  |- utils/ - Utility functions

### PowerTools Integration
This tool should use the PowerTools Context and API hooks for accessing Dynamics 365 data:
```typescript
import { usePowerToolsApi } from 'powertools/apiHook';

// API services should be structured as hooks
export const useEntityService = () => {
  const { getAsJson, post } = usePowerToolsApi();
  
  // Service methods
}
```

### UI/UX Requirements
- Use Ant Design components for consistent look and feel
- Follow responsive design principles
- Implement proper loading states and error handling
- Entity display names should be shown instead of schema names when possible
- Clickable elements should clearly indicate their interactivity

### Specific Task
I need help with [SPECIFIC TASK OR FEATURE], which involves [DETAILS ABOUT THE TASK].

[ADDITIONAL CONTEXT OR SPECIFIC QUESTIONS]
```

## Tips for Using This Template

1. Replace the placeholders (in [SQUARE BRACKETS]) with information specific to your project.

2. Provide as much context as possible about:
   - The exact entities and API endpoints you're working with
   - The specific features you're trying to implement
   - Any error messages or issues you're encountering

3. Include links to relevant Microsoft documentation.

4. Specify any UI/UX requirements or preferences.

5. If you need help with a specific file, either attach it or provide the path in the repository.

6. For complex tasks, break them down into smaller, focused prompts.

## Example Filled Template

```
I'm working on a Power Tool for the PowerTools UI framework that integrates with Microsoft Dynamics 365 / Power Platform. This tool will allow administrators to view and export audit logs from their Dynamics 365 environment.

The PowerTools UI framework provides authentication, common UI components, API access, and context management for tools that enhance Dynamics 365/Power Platform administration and development.

Here's the context you need:

### Repository Structure
The tools repository contains multiple Power Tools, each focused on specific functionality:
- power-audit: Audit log viewer for tracking changes in Dynamics 365
- solution-manager: Manages solution components and deployments
- solutions-viewer: Displays solution components and dependencies
- plugin-trace-viewer: Views plugin execution logs

### Microsoft Resources
This tool interacts with the following Microsoft Dynamics 365 / Power Platform resources:
- Entity/Table: audit - Contains records of changes made to entity records
- API Endpoint: /api/data/v9.0/audits - Retrieves audit log records
- Documentation Reference: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/audit

Please refer to the official Microsoft documentation at https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/ when working with entities and API calls.

### Technical Stack
- React 18
- TypeScript 4.9
- Ant Design 5.20.3
- PowerTools UI framework

### Project Structure Guidelines
The tool should follow the established pattern:
- src/
  |- index.tsx - Entry point
  |- AppRouter.tsx - Routing configuration
  |- models/ - TypeScript interfaces
  |- views/ - Main view components
  |- components/ - Reusable UI components
  |- api/ - API service functions
  |- powertools/ - Framework integration
  |- utils/ - Utility functions

### PowerTools Integration
This tool should use the PowerTools Context and API hooks for accessing Dynamics 365 data:
```typescript
import { usePowerToolsApi } from 'powertools/apiHook';

// API services should be structured as hooks
export const useAuditService = () => {
  const { getAsJson, post } = usePowerToolsApi();
  
  // Service methods
}
```

### UI/UX Requirements
- Use Ant Design components for consistent look and feel
- Follow responsive design principles
- Implement proper loading states and error handling
- Entity display names should be shown instead of schema names when possible
- Clickable elements should clearly indicate their interactivity

### Specific Task
I need help with implementing a filter function in the audit log viewer that allows users to filter by date range, operation type, and entity name. The function should update the query parameters sent to the API.

I've started implementing this in src/views/AuditLogView.tsx but I'm having trouble with the date range filter and how to properly combine multiple filter conditions.
``` 