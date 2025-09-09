import express, {Request, Response} from 'express';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import dotenv from 'dotenv';

dotenv.config();

import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListToolsRequestSchema,
    ListPromptsRequestSchema,
    CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {MoneybirdClient} from './services/moneybird.js';
import {isMoneybirdError, MoneybirdRateLimitError} from './common/errors.js';
import {z} from 'zod';
import {ListContactsSchema, MoneybirdContact, listContacts} from './operations/contacts.js';
import {MoneybirdInvoice} from './operations/invoices.js';


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

function progressUpdates(operation: string): NodeJS.Timeout {
    const startTime = Date.now();
    return setInterval(() => {
        console.error(`Still working on ${operation}... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
    }, 2000); // Send progress message every 2 seconds
}

// Deze functie maakt een geconfigureerde MCP-Server + HTTP Router
// @ts-ignore
export async function createMoneybirdMcpRouter({ token, administrationId }) {
    if (!token || !administrationId) {
        throw new Error('Missing Moneybird credentials');
    }

    const moneybirdClient = new MoneybirdClient(token, administrationId);

    // MCP server aanmaken
    const server = new Server({
        name: 'moneybird-mcp-server',
        version: 'v1',
        description: 'MCP server for interacting with Moneybird API',
        contactEmail: 'support@yourdomain.com',
        autoImplementResourcesList: true,
    },  {capabilities: {tools: {}, prompts: {}}});


    // MCP server
    // const server = new Server(
    //     {
    //         name: 'moneybird-mcp-server',
    //         version: `v${VERSION.toString()}`,
    //         description: 'MCP server for interacting with Moneybird API',
    //         contactEmail: process.env.CONTACT_EMAIL || 'info@example.com',
    //         autoImplementResourcesList: true,
    //     },
    //     {capabilities: {tools: {}, prompts: {}}}
    // );
/*
* HIER DE HANDLERS!
* */
    // === Handlers (kopie van je index.ts) ===
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "list_contacts",
                    description: "List all contacts from your Moneybird account with optional filtering",
                    inputSchema: {
                        type: "object",
                        properties: {
                            page: {type: "number", description: "Page number for pagination"},
                            perPage: {type: "number", description: "Items per page"},
                            query: {type: "string", description: "General search term across contact fields"},
                            filter: {
                                type: "string",
                                description: "Specific filter in format 'property:value' (e.g., 'created_after:2023-01-01 00:00:00 UTC', 'updated_after:2023-01-01', 'first_name:value')"
                            },
                            include_archived: {type: "boolean", description: "Include archived contacts in results"},
                            todo: {type: "string", description: "Filter contacts based on outstanding tasks"}
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

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const {name, arguments: args} = request.params;
        console.error(`Executing tool: ${name} with args:`, args);

        try {
            switch (name) {
                case "list_contacts": {
                    console.error('Fetching contacts from Moneybird...');
                    const progress = progressUpdates('fetching contacts');

                    try {
                        // Convert args to the expected format for our listContacts function
                        const options = args as z.infer<typeof ListContactsSchema>;

                        // Log filter information
                        if (options.filter) {
                            console.error(`Applying filter: ${options.filter}`);
                        }
                        if (options.query || options.include_archived || options.todo) {
                            console.error(`Additional parameters: ${JSON.stringify({
                                query: options.query,
                                include_archived: options.include_archived,
                                todo: options.todo
                            })}`);
                        }

                        const result = await listContacts(options, moneybirdClient);
                        clearInterval(progress);

                        const contacts = result.contacts;
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

                        // Add filter information to response if filters were applied
                        let responseText = JSON.stringify(formattedContacts, null, 2);
                        if (result.filtered) {
                            responseText = `Filtered contacts with criteria: ${JSON.stringify(result.filterCriteria)}\n\n${responseText}`;
                        }

                        return {
                            content: [{type: "text", text: responseText}]
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
                    const {method, path, data} = args as {
                        method: 'get' | 'post' | 'put' | 'delete',
                        path: string,
                        data?: any
                    };
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

    /* --------------------------- MCP HANDLERS: PROMPTS ------------------------ */

    server.setRequestHandler(ListPromptsRequestSchema, async () => {
        return {
            prompts: [
                {
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
    /*
    * TOT HIER HIER DE HANDLERS!
    * */
    // Transport + Router
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless (handig voor n8n)
    });
    await server.connect(transport);

    const router = express.Router();

    // Zorgt dat clients zonder expliciete Accept-header toch oké zijn
    router.use((req, _res, next) => {
        if (!req.headers.accept) {
            req.headers.accept = 'application/json, text/event-stream';
        }
        next();
    });

    // Streamable HTTP endpoint (SSE/JSON)
    router.post('/', async (req: Request, res: Response) => {
        try {
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error('HTTP transport error:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {code: -32603, message: 'Internal server error'},
                    id: null,
                });
            }
        }
    });

    // Optioneel: altijd-JSON endpoint (makkelijk voor n8n)
    router.post('/json', async (req: Request, res: Response) => {
        req.headers.accept = 'application/json';
        try {
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error('HTTP transport error (json):', err);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {code: -32603, message: 'Internal server error'},
                    id: null,
                });
            }
        }
    });

    return router;
}
