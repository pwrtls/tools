# Query Builder - Power Tool

A comprehensive query building tool for Microsoft Dynamics 365 / Power Platform that allows users to build, test, and execute queries using multiple query languages.

## Features

### Multi-Language Query Support
- **OData Queries**: Build REST API queries using OData syntax
- **FetchXML Queries**: Create XML-based queries native to Dynamics 365
- **SQL Queries**: Use familiar SQL syntax (with conversion to OData)

### Entity Metadata Integration
- Real-time entity metadata from Dataverse APIs
- Entity and attribute discovery
- Display names instead of schema names
- Intelligent autocomplete and suggestions

### Query Testing & Validation
- Execute queries against connected environment
- Syntax validation before execution
- Real-time error reporting
- Query result preview

### Results Display
- Paginated results table
- Export query results
- Column metadata display
- Record statistics

### Developer Features
- Monaco Editor with syntax highlighting
- Intellisense/typeahead support
- Intellisense provides table and column suggestions while typing. Begin
  writing a query and available entities or attributes will appear automatically.
- Sample query templates
- Query history (future)

## Usage

### Getting Started
1. Ensure you have an active connection to a Dynamics 365 / Power Platform environment
2. Select your preferred query language (OData, FetchXML, or SQL)
3. Build your query using the Monaco editor
4. Click "Execute Query" to test and see results

### OData Examples
```
/api/data/v9.2/accounts?$select=name,accountnumber,createdon&$top=10
/api/data/v9.2/contacts?$filter=statecode eq 0&$orderby=fullname
```

### FetchXML Examples
```xml
<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
  <entity name="account">
    <attribute name="name" />
    <attribute name="accountnumber" />
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
  </entity>
</fetch>
```

### Query Building Tips
1. Use the sample queries as starting points
2. Leverage intellisense for entity and attribute names
3. Start with simple queries and build complexity gradually
4. Test queries frequently to catch errors early

## Technical Architecture

### Built With
- React 18 + TypeScript
- Ant Design UI components
- Monaco Editor for code editing
- PowerTools Framework for Dataverse connectivity

### Key Components
- **QueryBuilder**: Main query interface
- **MetadataService**: Entity/attribute metadata management
- **QueryService**: Query execution and validation
- **PowerTools Integration**: Authenticated API access

### API Integration
Uses Microsoft Dataverse Web API endpoints:
- `/api/data/v9.2/EntityDefinitions` - Entity metadata
- `/api/data/v9.2/{entityset}` - Data queries
- Query metadata endpoints for schema information

## Development

### Setup
```bash
npm install
npm start
```

### Building
```bash
npm run build
```

### Testing
Test queries against a real Dynamics 365 environment using the PowerTools development server.

## Security & Permissions

This tool requires:
- Active connection to Dynamics 365 / Power Platform
- Read permissions on entities being queried
- Metadata read permissions for entity discovery

All queries are executed within the security context of the connected user.

## Limitations

- SQL queries are converted to OData (some SQL features may not be supported)
- Query results are limited to 5000 records per request
- Complex joins may require FetchXML instead of OData
- Some advanced OData features may require specific environment configurations

## Support

For issues or feature requests, please refer to the PowerTools framework documentation and support channels.
