#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
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

// Create MCP server with longer timeouts
const server = new Server({
  name: 'moneybird-mcp-server',
  version: `v${VERSION.toString()}`,
  description: 'MCP server for interacting with Moneybird API',
  contactEmail: process.env.CONTACT_EMAIL || 'vanderheijden86@gmail.com',
  autoImplementResourcesList: true,
}, {
  capabilities: {
    tools: {},
    prompts: {}
  },
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
  process.stdout.write = function (chunk: string | Uint8Array, encoding?: BufferEncoding, callback?: (err?: Error) => void): boolean {
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

// Add this function to the top of your file
function progressUpdates(operation: string): NodeJS.Timeout {
  const startTime = Date.now();
  return setInterval(() => {
    console.error(`Still working on ${operation}... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
  }, 2000); // Send progress message every 2 seconds
}

// Add a utility function to chunk large responses
function chunkResponse(data: any, maxSize: number = 100): any[] {
  if (!Array.isArray(data) || data.length <= maxSize) {
    return [data];
  }

  const chunks = [];
  for (let i = 0; i < data.length; i += maxSize) {
    chunks.push(data.slice(i, i + maxSize));
  }
  return chunks;
}

// At the top level of your file
let lastSuccessfulOperation = Date.now();
let consecutiveErrors = 0;

// Add this function
function updateHealthMetrics(success: boolean) {
  if (success) {
    lastSuccessfulOperation = Date.now();
    consecutiveErrors = 0;
  } else {
    consecutiveErrors++;
    console.error(`Health metrics: ${consecutiveErrors} consecutive errors`);
  }
}

// Define available tools handler (resources/list endpoint)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_contacts",
        description: "List all contacts from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {
            page: {type: "number", description: "Page number for pagination"},
            perPage: {type: "number", description: "Items per page"}
          },
          additionalProperties: false
        }
      },
      {
        name: "get_contact",
        description: "Get a specific contact by ID from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {
            contact_id: {type: "string", description: "The ID of the contact to retrieve"}
          },
          required: ["contact_id"],
          additionalProperties: false
        }
      },
      {
        name: "list_sales_invoices",
        description: "List all sales invoices from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {
            page: {type: "number", description: "Page number for pagination"},
            perPage: {type: "number", description: "Items per page"}
          },
          additionalProperties: false
        }
      },
      {
        name: "get_sales_invoice",
        description: "Get a specific sales invoice by ID from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {
            invoice_id: {type: "string", description: "The ID of the sales invoice to retrieve"}
          },
          required: ["invoice_id"],
          additionalProperties: false
        }
      },
      {
        name: "list_financial_accounts",
        description: "List all financial accounts from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "list_products",
        description: "List all products from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "list_projects",
        description: "List all projects from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "list_time_entries",
        description: "List all time entries from your Moneybird account",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "moneybird_request",
        description: "Make a custom request to the Moneybird API",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              enum: ["get", "post", "put", "delete"],
              description: "HTTP method for the request"
            },
            path: {
              type: "string",
              description: "API path (without administration ID prefix)"
            },
            data: {
              description: "Request data for POST and PUT requests (optional)"
            }
          },
          required: ["method", "path"],
          additionalProperties: false
        }
      },
      {
        name: "moneybird_assistant",
        description: "Get assistance with using the Moneybird MCP server",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {name, arguments: args} = request.params;
  console.error(`Executing tool: ${name} with args:`, args);

  try {
    switch (name) {
      case "list_contacts": {
        console.error('Fetching contacts from Moneybird...');
        const progress = progressUpdates('fetching contacts');

        try {
          const contacts = await moneybirdClient.getContacts();
          clearInterval(progress);
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

          // Chunk large responses
          const chunks = chunkResponse(formattedContacts, 50);
          if (chunks.length > 1) {
            return {
              content: [{
                type: "text",
                text: `Retrieved ${formattedContacts.length} contacts. Showing first ${chunks[0].length}:\n\n${JSON.stringify(chunks[0], null, 2)}\n\n(Response truncated for stability. Use pagination to see more.)`
              }]
            };
          }

          return {
            content: [{type: "text", text: JSON.stringify(formattedContacts, null, 2)}]
          };
        } catch (error) {
          clearInterval(progress);
          throw error;
        }
      }

      case "get_contact": {
        const {contact_id} = args as { contact_id: string };
        console.error(`Fetching contact with ID: ${contact_id}`);
        const contact = await moneybirdClient.getContact(contact_id);
        console.error('Successfully retrieved contact');

        return {
          content: [{type: "text", text: JSON.stringify(contact, null, 2)}]
        };
      }

      case "list_sales_invoices": {
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
          content: [{type: "text", text: JSON.stringify(formattedInvoices, null, 2)}]
        };
      }

      case "get_sales_invoice": {
        const {invoice_id} = args as { invoice_id: string };
        console.error(`Fetching sales invoice with ID: ${invoice_id}`);
        const invoice = await moneybirdClient.getSalesInvoice(invoice_id);
        console.error('Successfully retrieved invoice');

        return {
          content: [{type: "text", text: JSON.stringify(invoice, null, 2)}]
        };
      }

      case "list_financial_accounts": {
        console.error('Fetching financial accounts from Moneybird...');
        const accounts = await moneybirdClient.getFinancialAccounts();
        console.error(`Successfully retrieved ${accounts.length} accounts`);

        return {
          content: [{type: "text", text: JSON.stringify(accounts, null, 2)}]
        };
      }

      case "list_products": {
        console.error('Fetching products from Moneybird...');
        const products = await moneybirdClient.getProducts();
        console.error(`Successfully retrieved ${products.length} products`);

        return {
          content: [{type: "text", text: JSON.stringify(products, null, 2)}]
        };
      }

      case "list_projects": {
        console.error('Fetching projects from Moneybird...');
        const projects = await moneybirdClient.getProjects();
        console.error(`Successfully retrieved ${projects.length} projects`);

        return {
          content: [{type: "text", text: JSON.stringify(projects, null, 2)}]
        };
      }

      case "list_time_entries": {
        console.error('Fetching time entries from Moneybird...');
        const timeEntries = await moneybirdClient.getTimeEntries();
        console.error(`Successfully retrieved ${timeEntries.length} time entries`);

        return {
          content: [{type: "text", text: JSON.stringify(timeEntries, null, 2)}]
        };
      }

      case "moneybird_request": {
        const {method, path, data} = args as { method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any };
        console.error(`Making ${method.toUpperCase()} request to ${path}`);

        // Parse data if it's a JSON string
        let processedData = data;
        if (typeof data === 'string') {
          try {
            processedData = JSON.parse(data);
          } catch (e) {
            // If it's not valid JSON, keep the original
            console.error('Warning: Could not parse data as JSON, using as-is');
          }
        }

        const result = await moneybirdClient.request(method, path, processedData);
        console.error('Request completed successfully');

        return {
          content: [{type: "text", text: JSON.stringify(result, null, 2)}]
        };
      }

      case "moneybird_assistant": {
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

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);

    // Create appropriate error response
    let errorMessage = `Failed to execute ${name}: ${error.message}`;

    // Check for specific error types
    if (isMoneybirdError(error)) {
      errorMessage = formatMoneybirdError(error);
    } else if (error.response && error.response.data) {
      errorMessage += `\nDetails: ${JSON.stringify(error.response.data)}`;
    }

    return {
      content: [{type: "text", text: errorMessage}],
      isError: true
    };
  }
});

// Define available prompts handler (prompts/list endpoint)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [{
      name: 'moneybird_assistant',
      description: 'Get assistance with using the Moneybird MCP server',
      systemPrompt: `You are a financial assistant that helps users with their Moneybird accounting software.
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
    }]
  };
});

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
        console.error("FATAL: Server initialization timeout after " + (GLOBAL_TIMEOUT_MS / 1000) + " seconds. Exiting...");
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

    // Add a periodic health check
    const healthCheck = setInterval(() => {
      const idle = Date.now() - lastSuccessfulOperation;
      if (idle > 5 * 60 * 1000) { // 5 minutes
        console.error("Warning: No successful operations in last 5 minutes");
      }
    }, 60 * 1000);
    healthCheck.unref(); // Don't prevent Node from exiting
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