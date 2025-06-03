# Query Builder

A Power Tools React app for building and executing Dataverse queries.

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

- Enter a SQL, OData, or FetchXML query.
- Choose the query type, set `Top N` and `Count Only` if needed, then click **Submit**.
- Results appear in a table with pagination.
- Use **Export CSV** to download results.

## Notes

SQL conversion to OData is implemented as a placeholder. You may enhance it to support complex SQL syntax.
