# Power Automate Flowchart

A Power Tools extension for analyzing and documenting Power Automate flows. This tool helps administrators and developers understand, visualize, and document their Power Automate flows.

## Important Note

This tool is **not a standalone application**. It must be loaded within the PowerTools UI framework which provides the authenticated connection to Power Platform environments. All tools use the PowerTools Context for API access.

## Features

- **Flow List View**: Browse all available flows in your Power Platform environment
- **Flow Analysis**: Detailed analysis of flow structure, connectors, and dependencies
- **Visual Flow Diagram**: Interactive visualization of flow steps using Mermaid.js
- **Documentation Generation**: Export flow documentation in various formats
- **Dependency Tracking**: Identify connections, variables, and dependencies
- **Issue Detection**: Highlight potential issues and best practices

## Microsoft Power Platform API Integration

This tool integrates with the [Microsoft Dataverse Web API for Power Automate flows](https://learn.microsoft.com/en-us/power-automate/manage-flows-with-code?tabs=webapi#interact-with-dataverse-apis). 

Key points about the API integration:
- Flows are stored in the `workflow` table in Dataverse
- The tool queries the `/api/data/v9.2/workflows` endpoint with appropriate filters
- For category 5 flows (Modern Flow - Automated, instant or scheduled flows)
- The flow definition is stored in the `clientdata` field as JSON
- Flow connections, actions, and triggers are extracted from the definition

## Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Power Platform environment access
- PowerTools UI framework

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pwrtls/tools.git
   cd tools/flowchart
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

## Usage

1. **Connect to Environment**:
   - Launch the tool through Power Tools UI
   - Select your Power Platform environment
   - Authenticate with your credentials

2. **Browse Flows**:
   - View the list of available flows
   - Filter and search flows as needed
   - Click on a flow to analyze it

3. **Analyze Flow**:
   - View the visual flow diagram
   - Check connectors and dependencies
   - Review potential issues and recommendations

4. **Export Documentation**:
   - Download flow diagram as SVG
   - Export documentation in Markdown or PDF format
   - Share analysis results with team members

## Development

This tool follows the [Power Tools Development Guide](../DEVELOPMENT.md) and must be loaded within the PowerTools UI framework.

For development purposes, the tool includes mock data that simulates the Power Platform API responses. Set `USE_MOCK_DATA = true` in `src/api/flowService.ts` to use this mode.

### Project Structure

```
flowchart/
├── src/
│   ├── components/     # React components
│   ├── models/         # TypeScript interfaces
│   ├── api/            # API services
│   ├── powertools/     # Power Tools integration
│   ├── mock/           # Mock data for development
│   └── utils/          # Utility functions
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

### Building

```bash
npm run build
# or
yarn build
```

### Testing

```bash
npm test
# or
yarn test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 