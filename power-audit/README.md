# Power Audit Tool

A Power Platform tool for viewing, analyzing, and exporting Dynamics 365 audit logs.

## Overview

The Power Audit Tool enables administrators and developers to easily track and investigate changes made within their Dynamics 365 environment. This tool provides a user-friendly interface for querying, filtering, and exporting audit data.

## Features

- **Comprehensive Audit Log View**: View a list of all audit records with essential information
- **Detailed Record View**: Examine specific audit records in detail
- **Advanced Filtering**:
  - Filter by date range
  - Filter by operation type (Create, Update, Delete)
  - Filter by entity
  - Filter by user
- **Data Export**: Export audit logs to CSV for offline analysis
- **User-Friendly UI**:
  - Display friendly entity names (instead of schema names)
  - Show user names (instead of IDs)
  - Visual indication of clickable rows
- **Pagination**: Handle large volumes of audit data efficiently
- **Performance Optimizations**: Cache metadata lookups for improved performance

## Installation

```bash
# Install dependencies
npm install

# Build the tool
npm run build
```

## Development

```bash
# Start development server
npm start
```

## Architecture

This tool follows the PowerTools UI framework architecture pattern:

- **API Services**: Encapsulated in hook-based services
- **UI Components**: Built with Ant Design
- **Routing**: Uses React Router with hash-based routing
- **State Management**: Local React state with context for global state

## Technical Details

### Microsoft Resources

This tool interacts with the following Dynamics 365 resources:

- **Entity**: `audit` - Contains records of changes made to entity records
- **API Endpoint**: `/api/data/v9.0/audits` - Retrieves audit log records
- **Documentation**: [Microsoft Dynamics 365 Audit Entity Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/audit)

### Dependencies

- React 18
- TypeScript 4.9+
- Ant Design 5.20.3+
- Day.js for date handling

## Usage

1. Navigate to the Power Audit Tool within PowerTools UI
2. Use the filter controls to narrow down the audit records of interest
3. Click on any row to view detailed information about that audit record
4. Use the export button to download audit data as CSV

## Contributing

When contributing to this tool, please follow the guidelines in the main [DEVELOPMENT.md](../DEVELOPMENT.md) document. 