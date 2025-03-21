# Moneybird MCP Server

A Model Context Protocol (MCP) server that provides access to the Moneybird API.

## Overview

This server allows AI assistants to interact with your Moneybird accounting data using the Model Context Protocol. It provides various tools to:

- List and retrieve contacts
- View sales invoices
- Check financial accounts
- Access products and projects
- View time entries
- Make custom Moneybird API requests

## Prerequisites

- Node.js (v18 or higher recommended)
- A Moneybird account with API access
- A Moneybird API token

## Setup

1. Clone this repository:
   ```
   git clone https://github.com/your-username/moneybird-mcp-server.git
   cd moneybird-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create `.env` file from the example:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your Moneybird API credentials:
   - `MONEYBIRD_API_TOKEN`: Your Moneybird API token (generate at https://moneybird.com/user/applications)
   - `MONEYBIRD_ADMINISTRATION_ID`: Your Moneybird administration ID (found in URL when logged in)
   - `MCP_SERVER_PORT`: The port to run the MCP server on (default: 3000)

## Running the Server

For development:
```
npm run dev
```

For production:
```
npm run build
npm start
```

## Using with AI Assistants

This MCP server is compatible with any AI assistant that supports the Model Context Protocol. Once running, you can connect it to your AI assistant by providing the server URL:

```
http://your-server-address:3000
```

## Available Tools

The server provides the following tools:

- `list_contacts`: List all contacts in Moneybird
- `get_contact`: Get details for a specific contact by ID
- `list_sales_invoices`: List all sales invoices
- `get_sales_invoice`: Get details for a specific sales invoice by ID
- `list_financial_accounts`: List all financial accounts
- `list_products`: List all products
- `list_projects`: List all projects
- `list_time_entries`: List all time entries
- `moneybird_request`: Make a custom request to the Moneybird API

## Security

This server should be deployed with appropriate security measures, as it provides access to your Moneybird data. Consider:

- Running behind a secure proxy
- Implementing authentication for the MCP server
- Using HTTPS
- Restricting network access

## License

MIT 