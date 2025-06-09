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
