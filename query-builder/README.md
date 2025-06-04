# Query Builder

A Power Tools React app for building and executing Dataverse queries with intelligent auto-completion.

## Features

### Dynamic Intellisense
The query builder now includes intelligent auto-completion for SQL queries:

- **Entity/Table Suggestions**: Type `FROM` or `JOIN` followed by a space to see available Dataverse entities
- **Attribute/Column Suggestions**: Type an entity name followed by a dot (`.`) to see available attributes for that entity
- **Context-Aware**: Suggestions are provided based on the current query context (SELECT, WHERE, ORDER BY, etc.)
- **Keyboard Navigation**: Use arrow keys to navigate suggestions, Enter/Tab to select, Escape to close
- **Metadata Caching**: Entity and attribute metadata is cached for 5 minutes to improve performance

## Development

1. Install dependencies (node modules) in this folder:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm start
   ```

The app runs on port 4203 by default. Ensure the PowerTools API script loads in `public/index.html` when running inside the PowerTools host.

## Usage

- Enter a SQL, OData, or FetchXML query with intelligent auto-completion for SQL queries
- Choose the query type, set `Top N` and `Count Only` if needed, then click **Submit**
- Results appear in a table with pagination
- Use **Export CSV** to download results

### Intellisense Usage Examples

1. **Entity suggestions**: Type `SELECT * FROM ` and see available entities
2. **Attribute suggestions**: Type `SELECT account.` and see available account attributes
3. **Context-aware suggestions**: In a WHERE clause after specifying a FROM entity, get attribute suggestions

## Architecture

### Core Components

- **QueryIntellisense**: Main component providing auto-completion functionality
- **MetadataService**: Handles fetching and caching of Dataverse metadata
- **QueryParser**: Lightweight SQL parser for determining suggestion context

### Files Structure

- `src/components/QueryIntellisense.tsx` - Main intellisense component
- `src/services/metadataService.ts` - Metadata fetching and caching service
- `src/utils/queryParser.ts` - SQL context parsing utilities

## Notes

SQL conversion to OData is implemented as a placeholder. You may enhance it to support complex SQL syntax.

The intellisense system fetches metadata from Dataverse using the PowerTools API and provides context-aware suggestions for improved query building experience.
