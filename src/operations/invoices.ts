import { z } from 'zod';
import { getClient } from '../services/client.js';
import { MoneybirdClient } from '../services/moneybird.js';

export const GetInvoiceSchema = z.object({
  id: z.string().describe('The ID of the invoice to retrieve'),
});

export const ListInvoicesSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
  state: z.enum(['all', 'draft', 'open', 'scheduled', 'pending_payment', 'payment_failed', 'paid', 'late', 'late_draft'])
    .optional()
    .describe('Filter by invoice state'),
});

// Define the invoice details schema with Moneybird's invoice line fields
const InvoiceDetailsLineSchema = z.object({
  description: z.string().describe('Description of the invoice line'),
  price: z.number().describe('Price of the invoice line (per unit)'),
  amount: z.string().describe('Number of units for this invoice line'),
  tax_rate_id: z.string().optional().describe('Tax rate ID'),
  ledger_account_id: z.string().optional().describe('Ledger account ID'),
  project_id: z.string().optional().describe('Project ID'),
  product_id: z.string().optional().describe('Product ID'),
});

export const CreateInvoiceSchema = z.object({
  contact_id: z.string().describe('Contact ID for the invoice'),
  reference: z.string().optional().describe('Your reference for this invoice'),
  details_attributes: z.array(InvoiceDetailsLineSchema).describe('Invoice line items'),
  invoice_date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
  due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  payment_conditions: z.string().optional().describe('Payment conditions text'),
  notes: z.string().optional().describe('Notes to display on the invoice'),
  currency: z.string().optional().describe('Currency code (e.g., EUR, USD)'),
  prices_are_incl_tax: z.boolean().optional().describe('Whether prices include tax'),
  send_method: z.enum(['hand', 'email', 'post']).optional().describe('How to send the invoice'),
});

// Export the interface derived from the schema
export type MoneybirdInvoice = z.infer<typeof CreateInvoiceSchema> & {
  id: string;
  invoice_id?: string;
  state?: string;
  total_price_incl_tax?: string | number;
  total_price_excl_tax?: string | number; 
  paid_at?: string;
  [key: string]: any;
};

export const SendInvoiceSchema = GetInvoiceSchema.extend({
  delivery_method: z.enum(['email', 'simpler_invoicing', 'manual']).describe('How to deliver the invoice'),
  email_address: z.string().email().optional().describe('Email address to send the invoice to (if delivery_method is email)'),
  email_message: z.string().optional().describe('Email message when sending the invoice'),
});

export const UpdateInvoiceSchema = GetInvoiceSchema.extend({
  ...CreateInvoiceSchema.shape,
});

export async function getInvoice(id: string, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.getSalesInvoice(id);
}

export async function listInvoices(options?: z.infer<typeof ListInvoicesSchema>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  const invoices = await resolved.getSalesInvoices();
  
  // Filter by state if provided
  let filteredInvoices = invoices;
  if (options?.state && options.state !== 'all') {
    filteredInvoices = invoices.filter((invoice: any) => invoice.state === options.state);
  }
  
  // Basic pagination if requested
  if (options?.page && options?.perPage) {
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    return {
      invoices: filteredInvoices.slice(startIndex, endIndex),
      page: options.page,
      perPage: options.perPage,
      totalCount: filteredInvoices.length,
      totalPages: Math.ceil(filteredInvoices.length / options.perPage)
    };
  }
  
  return { invoices: filteredInvoices };
}

export async function createInvoice(invoiceData: z.infer<typeof CreateInvoiceSchema>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.request('post', 'sales_invoices', { sales_invoice: invoiceData });
}

export async function updateInvoice(id: string, invoiceData: Partial<z.infer<typeof CreateInvoiceSchema>>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.request('put', `sales_invoices/${id}`, { sales_invoice: invoiceData });
}

export async function sendInvoice(id: string, options: Omit<z.infer<typeof SendInvoiceSchema>, 'id'>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.request('post', `sales_invoices/${id}/send_invoice`, options);
}