#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MoneybirdClient } from './services/moneybird.js';
import dotenv from 'dotenv';
import { z } from 'zod';
import { isMoneybirdError, MoneybirdRateLimitError } from './common/errors.js';
import { createInterface } from 'readline';
import { VERSION } from './common/version.js';
import { MoneybirdContact } from './operations/contacts.js';
import { MoneybirdInvoice } from './operations/invoices.js';

// Initialize environment variables
dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'MONEYBIRD_API_TOKEN',
  'MONEYBIRD_ADMINISTRATION_ID'
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
const server = new McpServer({
  name: 'moneybird-mcp-server',
  version: `v${VERSION.toString()}`,
  description: 'MCP server for interacting with Moneybird API',
  contactEmail: process.env.CONTACT_EMAIL || 'vanderheijden86@gmail.com',
  autoImplementResourcesList: true,
});

// Format Moneybird errors for better readability
function formatMoneybirdError(error: any): string {
  let message = `Moneybird API Error: ${error.message}`;

  if (error.response) {
    message += `\nStatus: ${error.response.status}`;
    if (error.response.data) {
      message += `\nDetails: ${JSON.stringify(error.response.data)}`;
    }
  }

  if (error instanceof MoneybirdRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}`;
    if (error.resetAt) {
      message += `\nResets at: ${error.resetAt.toISOString()}`;
    }
  }

  return message;
}

// Debug JSON-RPC messages
function setupStdioDebugger() {
  const rl = createInterface({
    input: process.stdin,
    terminal: false
  });

  // Monitor incoming messages
  rl.on('line', (line) => {
    try {
      // Only log if it looks like JSON
      if (line.trim().startsWith('{')) {
        JSON.parse(line);
        console.error(`RECEIVED: ${line}`);
      }
    } catch (e) {
      // Not JSON or other error, ignore
    }
  });

  // Override stdout.write to monitor outgoing messages
  const originalStdoutWrite = process.stdout.write;
  // @ts-ignore - We need to override this for debugging
  process.stdout.write = function(chunk: string | Uint8Array, encoding?: BufferEncoding, callback?: (err?: Error) => void): boolean {
    if (typeof chunk === 'string' && chunk.trim().startsWith('{')) {
      try {
        // Check if it's JSON
        JSON.parse(chunk);
        console.error(`SENDING: ${chunk}`);
      } catch (e) {
        // Not JSON, ignore
      }
    }
    return originalStdoutWrite.call(this, chunk, encoding, callback);
  };
}

// List contacts tool
server.tool(
  'list_contacts',
  'List all contacts from your Moneybird account',
  {
    page: z.number().optional().describe('Page number for pagination'),
    perPage: z.number().optional().describe('Items per page')
  },
  async (params: { page?: number, perPage?: number }) => {
    try {
      console.error('Fetching contacts from Moneybird...');
      const contacts = await moneybirdClient.getContacts();
      console.error(`Successfully retrieved ${contacts.length} contacts`);

      // Format contacts for better readability
      const formattedContacts = contacts.map((contact: MoneybirdContact) => ({
        id: contact.id,
        company_name: contact.company_name,
        firstname: contact.firstname,
        lastname: contact.lastname,
        email: contact.email,
        phone: contact.phone
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(formattedContacts, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch contacts: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Get specific contact tool
server.tool(
  'get_contact',
  'Get a specific contact by ID from your Moneybird account',
  {
    contact_id: z.string().describe('The ID of the contact to retrieve')
  },
  async (params: { contact_id: string }) => {
    try {
      console.error(`Fetching contact with ID: ${params.contact_id}`);
      const contact = await moneybirdClient.getContact(params.contact_id);
      console.error('Successfully retrieved contact');
      
      return {
        content: [{ type: "text", text: JSON.stringify(contact, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching contact:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch contact: ${error.message}` }],
        isError: true
      };
    }
  }
);

// List sales invoices tool
server.tool(
  'list_sales_invoices',
  'List all sales invoices from your Moneybird account',
  {
    page: z.number().optional().describe('Page number for pagination'),
    perPage: z.number().optional().describe('Items per page')
  },
  async (params: { page?: number, perPage?: number }) => {
    try {
      console.error('Fetching sales invoices from Moneybird...');
      const invoices = await moneybirdClient.getSalesInvoices();
      console.error(`Successfully retrieved ${invoices.length} invoices`);

      // Format invoices for better readability
      const formattedInvoices = invoices.map((invoice: MoneybirdInvoice) => ({
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
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(formattedInvoices, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching sales invoices:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch sales invoices: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Get specific sales invoice tool
server.tool(
  'get_sales_invoice',
  'Get a specific sales invoice by ID from your Moneybird account',
  {
    invoice_id: z.string().describe('The ID of the sales invoice to retrieve')
  },
  async (params: { invoice_id: string }) => {
    try {
      console.error(`Fetching sales invoice with ID: ${params.invoice_id}`);
      const invoice = await moneybirdClient.getSalesInvoice(params.invoice_id);
      console.error('Successfully retrieved invoice');
      
      return {
        content: [{ type: "text", text: JSON.stringify(invoice, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching sales invoice:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch sales invoice: ${error.message}` }],
        isError: true
      };
    }
  }
);

// List financial accounts tool
server.tool(
  'list_financial_accounts',
  'List all financial accounts from your Moneybird account',
  {},
  async () => {
    try {
      console.error('Fetching financial accounts from Moneybird...');
      const accounts = await moneybirdClient.getFinancialAccounts();
      console.error(`Successfully retrieved ${accounts.length} accounts`);
      
      return {
        content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching financial accounts:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch financial accounts: ${error.message}` }],
        isError: true
      };
    }
  }
);

// List products tool
server.tool(
  'list_products',
  'List all products from your Moneybird account',
  {},
  async () => {
    try {
      console.error('Fetching products from Moneybird...');
      const products = await moneybirdClient.getProducts();
      console.error(`Successfully retrieved ${products.length} products`);
      
      return {
        content: [{ type: "text", text: JSON.stringify(products, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching products:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch products: ${error.message}` }],
        isError: true
      };
    }
  }
);

// List projects tool
server.tool(
  'list_projects',
  'List all projects from your Moneybird account',
  {},
  async () => {
    try {
      console.error('Fetching projects from Moneybird...');
      const projects = await moneybirdClient.getProjects();
      console.error(`Successfully retrieved ${projects.length} projects`);
      
      return {
        content: [{ type: "text", text: JSON.stringify(projects, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch projects: ${error.message}` }],
        isError: true
      };
    }
  }
);

// List time entries tool
server.tool(
  'list_time_entries',
  'List all time entries from your Moneybird account',
  {},
  async () => {
    try {
      console.error('Fetching time entries from Moneybird...');
      const timeEntries = await moneybirdClient.getTimeEntries();
      console.error(`Successfully retrieved ${timeEntries.length} time entries`);
      
      return {
        content: [{ type: "text", text: JSON.stringify(timeEntries, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error fetching time entries:', error);
      return {
        content: [{ type: "text", text: `Failed to fetch time entries: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Generic Moneybird request tool
server.tool(
  'moneybird_request',
  'Make a custom request to the Moneybird API',
  {
    method: z.enum(['get', 'post', 'put', 'delete']).describe('HTTP method for the request'),
    path: z.string().describe('API path (without administration ID prefix)'),
    data: z.any().optional().describe('Request data for POST and PUT requests (optional)')
  },
  async (params: { method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any }) => {
    try {
      console.error(`Making ${params.method.toUpperCase()} request to ${params.path}`);
      
      // Parse data if it's a JSON string
      let processedData = params.data;
      if (typeof params.data === 'string') {
        try {
          processedData = JSON.parse(params.data);
        } catch (e) {
          // If it's not valid JSON, keep the original
          console.error('Warning: Could not parse data as JSON, using as-is');
        }
      }
      
      const result = await moneybirdClient.request(params.method, params.path, processedData);
      console.error('Request completed successfully');
      
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error making API request:', error);
      // Include more error details if available
      let errorMessage = `API request failed: ${error.message}`;
      if (error.response && error.response.data) {
        errorMessage += `\nDetails: ${JSON.stringify(error.response.data)}`;
      }
      
      return {
        content: [{ type: "text", text: errorMessage }],
        isError: true
      };
    }
  }
);

// Add a helpful prompt as a tool
server.tool(
  'moneybird_assistant',
  'Get assistance with using the Moneybird MCP server',
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `You are a financial assistant that helps users with their Moneybird accounting software.
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
        }
      ]
    };
  }
);

// Global timeout to detect hanging server (60 seconds)
const GLOBAL_TIMEOUT_MS = 60000;
let serverInitialized = false;

// Start the server
async function runServer() {
  try {
    // Log version information on startup
    console.error(`Starting Moneybird MCP Server v${VERSION.toString()}...`);
    
    // Set up a global timeout to detect if the server is hanging
    const globalTimeout = setTimeout(() => {
      if (!serverInitialized) {
        console.error("FATAL: Server initialization timeout after " + (GLOBAL_TIMEOUT_MS/1000) + " seconds. Exiting...");
        process.exit(1);
      }
    }, GLOBAL_TIMEOUT_MS);

    // Ensure the timeout doesn't prevent Node.js from exiting
    globalTimeout.unref();
    
    // Set up debugging for JSON-RPC messages
    setupStdioDebugger();
    
    // Use console.error for pre-connection logging
    console.error("Creating StdioServerTransport...");
    
    // Create transport with debugging
    const transport = new StdioServerTransport();
    
    // Set a timeout to detect hangs during connection
    const connectionTimeout = setTimeout(() => {
      console.error("WARNING: Server connection is taking longer than expected. Possible hang detected.");
    }, 5000);
    
    console.error("Connecting server to transport...");
    await server.connect(transport);
    
    // Clear the timeout since connection succeeded
    clearTimeout(connectionTimeout);
    
    console.error("Server successfully connected to transport");
    
    // Mark server as initialized
    serverInitialized = true;
    
    console.error("Server is now running and waiting for requests");
    
    // Add signal handlers to gracefully exit
    process.on('SIGINT', () => {
      console.error("Received SIGINT signal");
      console.error("Server shutting down...");
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error("Received SIGTERM signal");
      console.error("Server shutting down...");
      process.exit(0);
    });
  } catch (error) {
    // Use console.error for errors during startup
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  // Use safe logging that works regardless of server state
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  // Use safe logging that works regardless of server state
  console.error('Unhandled rejection:', reason);
});

// Start the server
runServer().catch((error) => {
  // We can't use server.sendLoggingMessage here because if we get an error before 
  // the server is properly initialized, it won't be available
  console.error("Fatal error in main():", error);
  process.exit(1);
});