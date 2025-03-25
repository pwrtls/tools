# Power Audit Tool

A Power Platform tool for exporting and analyzing audit logs. This tool allows users to:

1. View audit logs from Microsoft Dataverse / Dynamics 365
2. Filter by date ranges, user, operation type, and entity
3. Export logs to various formats (CSV, JSON, Excel)
4. View audit details and changes made

## Development

### Requirements
- Node.js
- Yarn or npm

### Setup
1. Clone the repository
2. Navigate to the power-audit directory
3. Run `yarn install` or `npm install`
4. Run `yarn start` or `npm start` to start the development server

### Build
Run `yarn build` or `npm run build` to build the production version

## Usage
1. Select a connection in the Power Platform Tools
2. Use the date filters to select the desired time range
3. Apply additional filters as needed
4. Export the audit logs in your preferred format

## API Documentation
This tool uses the Microsoft Dataverse Web API to retrieve audit logs from the system. 