import { createServer, MCPServer, createTool, createPrompt } from '@modelcontextprotocol/sdk';
import { MoneybirdClient } from './services/moneybird';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'MONEYBIRD_API_TOKEN',
  'MONEYBIRD_ADMINISTRATION_ID',
  'MCP_SERVER_PORT'
];

// Check for required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Moneybird client
const moneybirdClient = new MoneybirdClient(
  process.env.MONEYBIRD_API_TOKEN!,
  process.env.MONEYBIRD_ADMINISTRATION_ID!
);

// Create MCP server
const server: MCPServer = createServer();

// Set up server metadata
server.metadata({
  name: 'Moneybird MCP Server',
  description: 'MCP server for interacting with Moneybird API',
  logo_url: 'https://www.moneybird.nl/assets/logo-d255782cccbc0c7ffe22fc3bbc9caa3ace8d639d0ecb58591c7987ad7c9fd9c4.svg',
  contact_email: process.env.CONTACT_EMAIL || 'example@example.com',
  legal_info_url: 'https://www.moneybird.nl/terms',
});

// Define tools for MCP server

// Get contacts
server.register(
  createTool({
    name: 'list_contacts',
    description: 'List all contacts in Moneybird',
    examples: ['Show me all contacts', 'List all customers'],
    parameters: {},
    handler: async () => {
      try {
        const contacts = await moneybirdClient.getContacts();
        return {
          response: {
            contacts: contacts.map((contact: any) => ({
              id: contact.id,
              company_name: contact.company_name,
              firstname: contact.firstname,
              lastname: contact.lastname,
              email: contact.email,
              phone: contact.phone
            }))
          }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch contacts: ${error.message}`
          }
        };
      }
    }
  })
);

// Get specific contact
server.register(
  createTool({
    name: 'get_contact',
    description: 'Get details for a specific contact by ID',
    examples: ['Get contact details for 123456789', 'Show information about contact 123456789'],
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'The ID of the contact to retrieve'
        }
      },
      required: ['contact_id']
    },
    handler: async (params: { contact_id: string }) => {
      try {
        const contact = await moneybirdClient.getContact(params.contact_id);
        return {
          response: { contact }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch contact: ${error.message}`
          }
        };
      }
    }
  })
);

// Get sales invoices
server.register(
  createTool({
    name: 'list_sales_invoices',
    description: 'List all sales invoices in Moneybird',
    examples: ['Show me all invoices', 'List all sales invoices'],
    parameters: {},
    handler: async () => {
      try {
        const invoices = await moneybirdClient.getSalesInvoices();
        return {
          response: {
            invoices: invoices.map((invoice: any) => ({
              id: invoice.id,
              invoice_id: invoice.invoice_id,
              contact_id: invoice.contact_id,
              reference: invoice.reference,
              state: invoice.state,
              date: invoice.date,
              due_date: invoice.due_date,
              total_price_incl_tax: invoice.total_price_incl_tax,
              total_price_excl_tax: invoice.total_price_excl_tax,
              currency: invoice.currency,
              paid_at: invoice.paid_at
            }))
          }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch sales invoices: ${error.message}`
          }
        };
      }
    }
  })
);

// Get specific sales invoice
server.register(
  createTool({
    name: 'get_sales_invoice',
    description: 'Get details for a specific sales invoice by ID',
    examples: ['Get invoice details for 123456789', 'Show information about invoice 123456789'],
    parameters: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'The ID of the sales invoice to retrieve'
        }
      },
      required: ['invoice_id']
    },
    handler: async (params: { invoice_id: string }) => {
      try {
        const invoice = await moneybirdClient.getSalesInvoice(params.invoice_id);
        return {
          response: { invoice }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch sales invoice: ${error.message}`
          }
        };
      }
    }
  })
);

// Get financial accounts
server.register(
  createTool({
    name: 'list_financial_accounts',
    description: 'List all financial accounts in Moneybird',
    examples: ['Show me all financial accounts', 'List all bank accounts'],
    parameters: {},
    handler: async () => {
      try {
        const accounts = await moneybirdClient.getFinancialAccounts();
        return {
          response: { accounts }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch financial accounts: ${error.message}`
          }
        };
      }
    }
  })
);

// Get products
server.register(
  createTool({
    name: 'list_products',
    description: 'List all products in Moneybird',
    examples: ['Show me all products', 'List all products and services'],
    parameters: {},
    handler: async () => {
      try {
        const products = await moneybirdClient.getProducts();
        return {
          response: { products }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch products: ${error.message}`
          }
        };
      }
    }
  })
);

// Get projects
server.register(
  createTool({
    name: 'list_projects',
    description: 'List all projects in Moneybird',
    examples: ['Show me all projects', 'List all active projects'],
    parameters: {},
    handler: async () => {
      try {
        const projects = await moneybirdClient.getProjects();
        return {
          response: { projects }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch projects: ${error.message}`
          }
        };
      }
    }
  })
);

// Get time entries
server.register(
  createTool({
    name: 'list_time_entries',
    description: 'List all time entries in Moneybird',
    examples: ['Show me all time entries', 'List all recorded time'],
    parameters: {},
    handler: async () => {
      try {
        const timeEntries = await moneybirdClient.getTimeEntries();
        return {
          response: { timeEntries }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to fetch time entries: ${error.message}`
          }
        };
      }
    }
  })
);

// Generic moneybird request
server.register(
  createTool({
    name: 'moneybird_request',
    description: 'Make a custom request to the Moneybird API',
    examples: [
      'Request GET /241/contacts',
      'Request POST /241/sales_invoices with {"contact_id": "12345"}'
    ],
    parameters: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['get', 'post', 'put', 'delete'],
          description: 'HTTP method for the request'
        },
        path: {
          type: 'string',
          description: 'API path (without administration ID prefix)'
        },
        data: {
          type: 'object',
          description: 'Request data for POST and PUT requests (optional)'
        }
      },
      required: ['method', 'path']
    },
    handler: async (params: { method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any }) => {
      try {
        const result = await moneybirdClient.request(
          params.method, 
          params.path, 
          params.data
        );
        return {
          response: { result }
        };
      } catch (error: any) {
        return {
          error: {
            message: `API request failed: ${error.message}`
          }
        };
      }
    }
  })
);

// Add a helpful prompt
server.register(
  createPrompt({
    name: 'moneybird_assistant',
    description: 'Moneybird assistant that can help with financial tasks',
    prompt: `You are a financial assistant that helps users with their Moneybird accounting software.
You can help them find information about contacts, invoices, financial accounts, and more.
Always be helpful, accurate, and professional.

Some things you can do:
- Look up contact information
- Find invoice details
- Check financial accounts
- List products and services
- View project information
- Access time entries

When users ask for financial information, try to be as specific as possible in your responses.`
  })
);

// Start the server
const port = parseInt(process.env.MCP_SERVER_PORT!, 10) || 3000;
server.listen(port, () => {
  console.log(`Moneybird MCP Server running on port ${port}`);
}); 