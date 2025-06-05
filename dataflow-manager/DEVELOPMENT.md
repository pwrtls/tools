# Dataflow Manager - Development Guidelines

## Overview

This document outlines the development guidelines specific to the Dataflow Manager tool. It should be read in conjunction with the main PowerTools development guidelines.

## Project Structure

```
dataflow-manager/
├── public/
│   ├── index.html              # PowerTools API script included
│   └── ...
├── src/
│   ├── @types/
│   │   └── index.d.ts          # PowerTools API type definitions
│   ├── api/
│   │   └── dataflowService.ts  # API service functions
│   ├── models/
│   │   ├── dataflow.ts         # Dataflow and user interfaces
│   │   └── oDataResponse.ts    # OData response interface
│   ├── powertools/
│   │   ├── context.tsx         # PowerTools context provider
│   │   └── apiHook.tsx         # PowerTools API hook
│   ├── views/
│   │   └── DataflowsView.tsx   # Main dataflow management view
│   ├── App.tsx                 # Main app component
│   └── AppRouter.tsx           # Application routing
├── package.json
├── tsconfig.json
├── README.md
├── PROJECT.md                  # Project documentation
└── DEVELOPMENT.md              # This file
```

## Development Setup

### Prerequisites
- Node.js (LTS version)
- npm or yarn
- Access to PowerTools UI framework
- Power Platform environment with dataflows

### Installation
```bash
cd dataflow-manager
npm install
```

### Development Server
```bash
npm start
```
The application runs on `http://localhost:4202`

### Build
```bash
npm run build
```

## API Integration Guidelines

### Dataverse Web API
- Use the PowerTools framework for all API calls
- Always include proper error handling
- Use TypeScript interfaces for response types
- Include fallback data for development/testing

#### Example API Call
```typescript
const query = new URLSearchParams();
query.set('$select', 'msdyn_dataflowid,msdyn_name,msdyn_description');
query.set('$filter', 'statecode eq 0');

const response = await window.PowerTools.get('/api/data/v9.2/msdyn_dataflows', query);
const data = await response.asJson<IoDataResponse<any>>();
```

### Power Query API
- Use the exact endpoint format for ownership updates
- Include proper headers (Content-Type: application/json)
- Handle both 200 and 204 success responses
- Provide detailed error messages

#### Example Update Call
```typescript
const url = `https://us.prod.powerquery.microsoft.com/api/dataflow/group/${groupId}/dataflow/${dataflowId}/update-owner`;
const response = await window.PowerTools.post(url, updateRequest, {
    'Content-Type': 'application/json'
});
```

## Component Development Guidelines

### DataflowsView Component
- Main component for dataflow management
- Uses Ant Design Table for data display
- Modal-based workflow for ownership assignment
- Real-time state updates after API calls

#### Key Features
- Loading states during API calls
- Error handling with user-friendly messages
- Search functionality in user selection
- Optimistic UI updates
- Azure AD Object ID mapping for correct user identification

#### Important Implementation Notes
- **User ID Mapping**: The Power Query API requires Azure AD Object IDs, not Dataverse system user IDs
- Users are fetched with both `systemuserid` and `azureactivedirectoryobjectid` fields and stored in the IUser interface
- Dataflow owners (`_ownerid_value`) contain system user IDs, requiring mapping to display names and Azure AD Object IDs
- Owner name mapping: `systemuserid` from dataflow → `systemUserId` field in user data → display user name
- Owner update mapping: `systemuserid` from dataflow → lookup `azureAdObjectId` for API calls
- The application handles fallback scenarios when Azure AD Object ID is not available
- **Client Request ID**: Uses PowerTools Azure AD App Client ID (`05aec6ff-18da-42b1-8261-ce4d99fdaf30`) instead of random UUIDs for better API acceptance

### State Management
- Use React hooks for local state
- Implement loading states for all async operations
- Update local state immediately after successful API calls
- Provide rollback mechanisms for failed operations

## Error Handling Strategy

### API Errors
- Catch all API errors and provide fallback behavior
- Log detailed errors to console for debugging
- Show user-friendly error messages
- Implement retry mechanisms where appropriate

### User Experience
- Show loading spinners during operations
- Provide clear success/failure feedback
- Maintain application state during errors
- Offer alternative actions when operations fail

## Testing Guidelines

### Unit Testing
- Test individual functions and components
- Mock PowerTools API calls
- Test error scenarios
- Validate data transformations

### Integration Testing
- Test complete workflows
- Verify API integrations
- Test with real PowerTools environment
- Validate user interactions

### Manual Testing Checklist
- [ ] Load dataflows from environment
- [ ] Display dataflow information correctly
- [ ] Load users from environment
- [ ] Assign ownership successfully
- [ ] Handle API errors gracefully
- [ ] Update UI after ownership changes
- [ ] Search functionality works
- [ ] Responsive design on different screens

## Code Quality Standards

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` types where possible
- Use proper type guards for API responses

### React Best Practices
- Use functional components with hooks
- Implement proper dependency arrays in useEffect
- Memoize expensive calculations
- Follow React naming conventions

### Ant Design Usage
- Use Ant Design components consistently
- Follow Ant Design design patterns
- Customize themes appropriately
- Ensure accessibility compliance

## Performance Considerations

### Data Loading
- Load dataflows and users in parallel
- Implement pagination for large datasets
- Cache API responses when appropriate
- Use loading states to improve perceived performance

### UI Performance
- Memoize table columns and data
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize re-renders with proper dependencies

## Security Guidelines

### API Security
- Never expose sensitive credentials
- Use PowerTools authentication exclusively
- Validate all user inputs
- Sanitize data before display

### Data Handling
- Don't store sensitive data locally
- Clear sensitive data from memory
- Use HTTPS for all communications
- Respect user permissions

## Deployment Guidelines

### Build Process
- Ensure clean build without warnings
- Test build artifacts locally
- Verify PowerTools integration
- Check for security vulnerabilities

### PowerTools Integration
- Must be deployed within PowerTools framework
- Verify API script inclusion
- Test authentication flows
- Validate environment connections

## Troubleshooting

### Common Issues

#### "Invalid Context" Error
- Verify PowerTools API script is loaded
- Check that tool is running within PowerTools framework
- Ensure proper authentication

#### API Call Failures
- Check network connectivity
- Verify user permissions
- Validate API endpoint URLs
- Check PowerTools authentication status

#### Data Loading Issues
- Verify Dataverse connection
- Check OData query syntax
- Validate response data structure
- Review error logs

### Debugging Tips
- Use browser developer tools
- Check PowerTools console logs
- Verify API responses in network tab
- Test with different user permissions

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and update documentation
- Monitor API endpoint changes
- Test with latest PowerTools versions

### Monitoring
- Track API success rates
- Monitor application performance
- Review user feedback
- Check error logs regularly

## Contributing

### Code Review Process
- Follow existing code patterns
- Ensure comprehensive testing
- Update documentation as needed
- Verify PowerTools integration

### Pull Request Guidelines
- Include clear description of changes
- Add tests for new functionality
- Update relevant documentation
- Ensure build passes successfully

## Future Development

### Planned Enhancements
- Bulk ownership operations
- Advanced filtering options
- Audit trail functionality
- Export capabilities

### Technical Debt
- Improve error handling coverage
- Add comprehensive test suite
- Optimize performance bottlenecks
- Enhance accessibility features

## Resources

### Documentation
- [PowerTools Development Guide](../DEVELOPMENT.md)
- [Ant Design Documentation](https://ant.design/)
- [React Documentation](https://reactjs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

### APIs
- [Dataverse Web API Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/)
- [Power Query API Documentation](https://learn.microsoft.com/en-us/rest/api/power-bi/dataflows)

### Support
- PowerTools support channels
- Microsoft Power Platform community
- GitHub issues and discussions 