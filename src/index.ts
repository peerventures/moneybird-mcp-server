#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MoneybirdClient } from './services/moneybird.js';
import dotenv from 'dotenv';
import { z } from 'zod';
import { isMoneybirdError, MoneybirdRateLimitError } from './common/errors.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  InitializeRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createInterface } from 'readline';


// Initialize environment variables
dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'MONEYBIRD_API_TOKEN',
  'MONEYBIRD_ADMINISTRATION_ID'
];

// Create MCP server
const server = new Server(
  {
    name: 'moneybird-mcp-server',
    version: '1.0.0',
    description: 'MCP server for interacting with Moneybird API',
    contactEmail: process.env.CONTACT_EMAIL || 'vanderheijden86@gmail.com',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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

process.on('uncaughtException', (error) => {
  // Use safe logging that works regardless of server state
  if (server && typeof server.sendLoggingMessage === 'function') {
    server.sendLoggingMessage({
      level: "error",
      data: `Uncaught exception: ${error}`,
    });
  } else {
    console.error('Uncaught exception:', error);
  }
});

process.on('unhandledRejection', (reason) => {
  // Use safe logging that works regardless of server state
  if (server && typeof server.sendLoggingMessage === 'function') {
    server.sendLoggingMessage({
      level: "error",
      data: `Unhandled rejection: ${reason}`,
    });
  } else {
    console.error('Unhandled rejection:', reason);
  }
});

server.setRequestHandler(InitializeRequestSchema, async (request) => {
  // Log the request with both methods to ensure visibility
  console.error("Received initialize request:", JSON.stringify(request));
  
  try {
    server.sendLoggingMessage({
      level: "info",
      data: `Received initialize request: ${JSON.stringify(request)}`,
    });

    // Return a proper initialize response with complete information
    console.error("Sending initialize response");
    return {
      serverInfo: {
        name: 'moneybird-mcp-server',
        version: '1.0.0',
        description: 'MCP server for interacting with Moneybird API',
        contactEmail: process.env.CONTACT_EMAIL || 'vanderheijden86@gmail.com',
      },
      capabilities: {
        tools: {
          list: true,
          call: true,
        },
      },
    };
  } catch (error) {
    console.error("Error in initialize handler:", error);
    throw error;
  }
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

// Define tool schemas
const ListContactsSchema = z.object({
  page: z.number().optional().describe('Page number for pagination'),
  perPage: z.number().optional().describe('Items per page')
});

const GetContactSchema = z.object({
  contact_id: z.string().describe('The ID of the contact to retrieve')
});

const ListSalesInvoicesSchema = z.object({
  page: z.number().optional().describe('Page number for pagination'),
  perPage: z.number().optional().describe('Items per page')
});

const GetSalesInvoiceSchema = z.object({
  invoice_id: z.string().describe('The ID of the sales invoice to retrieve')
});

const MoneybirdRequestSchema = z.object({
  method: z.enum(['get', 'post', 'put', 'delete']).describe('HTTP method for the request'),
  path: z.string().describe('API path (without administration ID prefix)'),
  data: z.any().optional().describe('Request data for POST and PUT requests (optional)')
});

// Add these interfaces at the top of your file
interface MoneybirdContact {
  id: string;
  company_name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;

  [key: string]: any; // For other properties that might exist
}

interface MoneybirdInvoice {
  id: string;
  invoice_id?: string;
  contact_id?: string;
  reference?: string;
  state?: string;
  date?: string;
  due_date?: string;
  total_price_incl_tax?: string | number;
  total_price_excl_tax?: string | number;
  currency?: string;
  paid_at?: string;

  [key: string]: any; // For other properties that might exist
}

// Register ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  server.sendLoggingMessage({
    level: "info",
    data: `Received ListTools request: ${JSON.stringify(request)}`,
  });
  
  return {
    tools: [
      {
        name: "list_contacts",
        description: "List contacts from Moneybird",
        inputSchema: ListContactsSchema,
      },
      {
        name: "get_contact",
        description: "Get a specific contact by ID",
        inputSchema: GetContactSchema,
      },
      {
        name: "list_sales_invoices",
        description: "List sales invoices from Moneybird",
        inputSchema: ListSalesInvoicesSchema,
      },
      {
        name: "get_sales_invoice",
        description: "Get a specific sales invoice by ID",
        inputSchema: GetSalesInvoiceSchema,
      },
      {
        name: "list_financial_accounts",
        description: "List financial accounts from Moneybird",
        inputSchema: z.object({}),
      },
      {
        name: "list_products",
        description: "List products from Moneybird",
        inputSchema: z.object({}),
      },
      {
        name: "list_projects",
        description: "List projects from Moneybird",
        inputSchema: z.object({}),
      },
      {
        name: "list_time_entries",
        description: "List time entries from Moneybird",
        inputSchema: z.object({}),
      },
      {
        name: "moneybird_request",
        description: "Make a custom request to the Moneybird API",
        inputSchema: MoneybirdRequestSchema,
      }
    ],
  };
});

// Register CallTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  server.sendLoggingMessage({
    level: "info",
    data: `Received CallTool request: ${JSON.stringify(request)}`,
  });
  
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "list_contacts": {
        const args = ListContactsSchema.parse(request.params.arguments);
        const contacts = await moneybirdClient.getContacts();

        // Add type annotation here
        const formattedContacts = contacts.map((contact: MoneybirdContact) => ({
          id: contact.id,
          company_name: contact.company_name,
          firstname: contact.firstname,
          lastname: contact.lastname,
          email: contact.email,
          phone: contact.phone
        }));

        return {
          content: [{type: "text", text: JSON.stringify(formattedContacts, null, 2)}],
        };
      }

      case "get_contact": {
        const args = GetContactSchema.parse(request.params.arguments);
        const contact = await moneybirdClient.getContact(args.contact_id);
        return {
          content: [{type: "text", text: JSON.stringify(contact, null, 2)}],
        };
      }

      case "list_sales_invoices": {
        const args = ListSalesInvoicesSchema.parse(request.params.arguments);
        const invoices = await moneybirdClient.getSalesInvoices();

        // Add type annotation here
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
          content: [{type: "text", text: JSON.stringify(formattedInvoices, null, 2)}],
        };
      }

      case "get_sales_invoice": {
        const args = GetSalesInvoiceSchema.parse(request.params.arguments);
        const invoice = await moneybirdClient.getSalesInvoice(args.invoice_id);
        return {
          content: [{type: "text", text: JSON.stringify(invoice, null, 2)}],
        };
      }

      case "list_financial_accounts": {
        const accounts = await moneybirdClient.getFinancialAccounts();
        return {
          content: [{type: "text", text: JSON.stringify(accounts, null, 2)}],
        };
      }

      case "list_products": {
        const products = await moneybirdClient.getProducts();
        return {
          content: [{type: "text", text: JSON.stringify(products, null, 2)}],
        };
      }

      case "list_projects": {
        const projects = await moneybirdClient.getProjects();
        return {
          content: [{type: "text", text: JSON.stringify(projects, null, 2)}],
        };
      }

      case "list_time_entries": {
        const timeEntries = await moneybirdClient.getTimeEntries();
        return {
          content: [{type: "text", text: JSON.stringify(timeEntries, null, 2)}],
        };
      }

      case "moneybird_request": {
        const args = MoneybirdRequestSchema.parse(request.params.arguments);
        const result = await moneybirdClient.request(
          args.method,
          args.path,
          args.data
        );
        return {
          content: [{type: "text", text: JSON.stringify(result, null, 2)}],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isMoneybirdError(error)) {
      throw new Error(formatMoneybirdError(error));
    }
    throw error;
  }
});

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
        const data = JSON.parse(line);
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

// Global timeout to detect hanging server (60 seconds)
const GLOBAL_TIMEOUT_MS = 60000;
let serverInitialized = false;

// Start the server
async function runServer() {
  try {
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
    console.error("Starting Moneybird MCP Server...");
    
    // Create transport with debugging
    console.error("Creating StdioServerTransport...");
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
    
    // Now that the server is connected, we can use sendLoggingMessage
    server.sendLoggingMessage({
      level: "info",
      data: "Moneybird MCP Server v0.0.2 running on stdio",
    });

    // Mark server as initialized
    serverInitialized = true;
    
    // Keep the Node.js process alive with a never-resolving promise
    return new Promise(() => {
      console.error("Server is now running and waiting for requests");
      
      // Add signal handlers to gracefully exit
      process.on('SIGINT', () => {
        console.error("Received SIGINT signal");
        server.sendLoggingMessage({
          level: "info",
          data: "Server shutting down...",
        });
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.error("Received SIGTERM signal");
        server.sendLoggingMessage({
          level: "info",
          data: "Server shutting down...",
        });
        process.exit(0);
      });
    });
  } catch (error) {
    // Use console.error for errors during startup
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Keep this line as is - it calls your modified runServer function
runServer().catch((error) => {
  // We can't use server.sendLoggingMessage here because if we get an error before 
  // the server is properly initialized, it won't be available
  console.error("Fatal error in main():", error);
  process.exit(1);
});