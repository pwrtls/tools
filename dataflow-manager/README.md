# Dataflow Manager

A Power Tools application for managing Power Query dataflow ownership assignments across your Power Platform environment.

## Overview

The Dataflow Manager tool allows administrators to:
- View all dataflows in the connected Power Platform environment
- See current ownership information for each dataflow
- Assign new owners to dataflows
- Manage dataflow ownership across workspaces

## Features

- **Dataflow Listing**: Display all dataflows with their current owners, workspaces, and modification dates
- **User Management**: Select from available users in the system to assign as new owners
- **Ownership Transfer**: Update dataflow ownership using the Power Query API
- **Search and Filter**: Find specific dataflows and users quickly
- **Real-time Updates**: See ownership changes reflected immediately in the interface

## API Integration

This tool integrates with the Power Query API to:
- Fetch dataflow information from the connected environment
- Retrieve user lists for ownership assignment
- Update dataflow ownership via the `/update-owner` endpoint

### API Endpoint Used

```
POST https://us.prod.powerquery.microsoft.com/api/dataflow/group/{groupId}/dataflow/{dataflowId}/update-owner
```

**Payload:**
```json
{
  "newOwnerName": "User Display Name",
  "newOwnerUserId": "user-guid",
  "previousOwnerUserId": "previous-owner-guid"
}
```

## Development

### Prerequisites
- Node.js (LTS version)
- npm or yarn
- Access to PowerTools UI framework

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

The application will run on `http://localhost:4202` and must be loaded within the PowerTools UI framework for proper API access.

### Project Structure
```
src/
├── api/                    # API service functions
│   └── dataflowService.ts  # Dataflow and user API calls
├── models/                 # TypeScript interfaces
│   ├── dataflow.ts        # Dataflow and user models
│   └── oDataResponse.ts   # OData response interface
├── powertools/            # PowerTools integration
│   ├── context.tsx        # PowerTools context provider
│   └── apiHook.tsx        # PowerTools API hook
├── views/                 # Main view components
│   └── DataflowsView.tsx  # Main dataflow management view
├── @types/                # TypeScript declarations
│   └── index.d.ts         # PowerTools API types
└── AppRouter.tsx          # Application routing
```

## Usage

1. **Load the tool** within the PowerTools UI framework
2. **Connect** to your Power Platform environment
3. **View dataflows** - The tool will automatically load all available dataflows
4. **Assign ownership** - Click "Assign Owner" for any dataflow to change its owner
5. **Select new owner** - Choose from the list of available users
6. **Confirm assignment** - The ownership will be updated via the Power Query API

## Security Considerations

- All API calls are made through the PowerTools framework with proper authentication
- User permissions are respected based on the connected Power Platform environment
- Ownership changes are logged and can be audited through Power Platform admin tools

## Troubleshooting

### Common Issues

1. **"Invalid Context" Error**
   - Ensure the tool is loaded within the PowerTools UI framework
   - Check that the PowerTools API script is properly loaded

2. **"No Connection Selected" Error**
   - Select a Power Platform environment connection in PowerTools
   - Verify you have appropriate permissions to the environment

3. **API Call Failures**
   - Check network connectivity
   - Verify Power Platform service availability
   - Ensure proper authentication tokens are available

## Contributing

When making changes to this tool:
1. Follow the existing code patterns and structure
2. Update type definitions if adding new API calls
3. Test with the PowerTools framework before submitting changes
4. Update this README if adding new features

## License

This tool is part of the PowerTools suite and follows the same licensing terms.
