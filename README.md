# Power Tools

This repositry contains published tools and example tools.

## jQuery-example

This is an example using [jQuery](https://jquery.com/). The tool fetches the solutions from the selected connection.

## svelte-example

This examples uses [Svelte](https://svelte.dev/). The tool fetches the solutions from the selected connection.

## webresources-viewer

A published tool which uses [React](https://reactjs.org/). The tool retrieves the web resources in a connection, paginated and allows downloading the web resource.

## solutions-viewer

A published tool that uses [React](https://reactjs.org/) and [React Router](https://reactrouter.com/). The tool gets the solutions in a connection, go into the solution and view the components of it with actionable items on each item.

## power-audit

A published tool that uses [React](https://reactjs.org/) and [React Router](https://reactrouter.com/). The tool allows users to view, filter, and export audit logs from Dynamics 365 / Power Platform. It provides detailed views of audit records including what changed in each operation.

## Query Builder

The Query Builder is a powerful, multi-functional tool designed to help you construct, convert, and test queries in real-time against your Dataverse environment. It's an indispensable utility for developers working with Dataverse APIs.

### Key Features:

- **Build Queries Visually**: Use a friendly interface to build complex queries without writing a single line of code.
- **Convert Between Languages**: Seamlessly convert queries between FetchXML, Web API, and OData formats.
- **Real-Time Testing**: Execute your queries directly against your Dataverse instance and see the results instantly.
- **SQL on TDS Endpoint**: Leverage the power of SQL to query your data. The tool sends SQL queries to the Power Tools backend, which uses a dedicated .NET helper service to communicate with the Dataverse TDS endpoint. This is necessary because the TDS endpoint only supports .NET-based clients.

### Using the TDS Endpoint via API

You can also interact with the TDS endpoint programmatically by sending requests to the Power Tools API. This is useful for building custom applications or scripts that need to query Dataverse using SQL.

Here is an example of how to execute a SQL query using `curl`:

```bash
# Required headers:
# - Authorization: Bearer <your-access-token>
# - X-Crm-Url: <your-dataverse-environment-url>

curl -X POST 'https://your-powertools-backend-url/api/v1/proxy/TDS' \
-H 'Authorization: Bearer <your-access-token>' \
-H 'X-Crm-Url: https://org.crm.dynamics.com' \
-H 'Content-Type: application/json' \
-d '{
    "query": "SELECT TOP 10 name, accountnumber FROM account"
}'
```

This will return a JSON response containing the query results. Remember to replace the placeholder values with your actual access token, environment URL, and backend URL.
