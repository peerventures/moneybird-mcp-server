import { z } from 'zod';
import { getClient } from '../services/client.js';

export const GetContactSchema = z.object({
  id: z.string().describe('The ID of the contact to retrieve'),
});

export const ListContactsSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
  query: z.string().optional().describe('Search term for general contact search'),
  filter: z.string().optional().describe('Filter string in format "property:value" (e.g., "created_after:2023-01-01 00:00:00 UTC", "updated_after:2023-01-01", "first_name:value")'),
  include_archived: z.boolean().optional().describe('Include archived contacts in the results'),
  todo: z.string().optional().describe('Filter contacts based on outstanding tasks')
});

export const CreateContactSchema = z.object({
  company_name: z.string().optional().describe('Company name'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  address: z.string().optional().describe('Address'),
  zipcode: z.string().optional().describe('Zip code'),
  city: z.string().optional().describe('City'),
  country: z.string().optional().describe('Country'),
  phone: z.string().optional().describe('Phone number'),
  email: z.string().email().optional().describe('Email address'),
  tax_number: z.string().optional().describe('Tax number'),
  chamber_of_commerce: z.string().optional().describe('Chamber of commerce'),
  bank_account: z.string().optional().describe('Bank account'),
  send_invoices_to_attention: z.string().optional().describe('Send invoices to attention'),
  send_invoices_to_email: z.string().email().optional().describe('Send invoices to email'),
  send_estimates_to_attention: z.string().optional().describe('Send estimates to attention'),
  send_estimates_to_email: z.string().email().optional().describe('Send estimates to email'),
  notes: z.string().optional().describe('Notes about the contact'),
});

export const UpdateContactSchema = GetContactSchema.extend({
  ...CreateContactSchema.shape,
});

// Export the interface derived from the schema
export type MoneybirdContact = z.infer<typeof CreateContactSchema> & {
  id: string;
  [key: string]: any;
};

export async function getContact(id: string) {
  const client = getClient();
  return await client.getContact(id);
}

export async function listContacts(options: z.infer<typeof ListContactsSchema> = {}) {
  const client = getClient();
  
  // If we have any filtering parameters, use the filter endpoint
  if (options.filter || options.query || options.include_archived || options.todo) {
    const params: Record<string, string | number | boolean> = {};
    
    // Handle pagination parameters
    if (options.page) params.page = options.page;
    if (options.perPage) params.per_page = options.perPage;
    
    // Handle filter parameter (the primary filtering mechanism)
    if (options.filter) {
      params.filter = options.filter;
    }
    
    // Handle other parameters
    if (options.query) params.query = options.query;
    if (options.include_archived) params.include_archived = options.include_archived;
    if (options.todo) params.todo = options.todo;
    
    // Build the URL with parameters
    const queryString = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    
    // Use the filter endpoint with query parameters
    const contacts = await client.request('get', `contacts/filter?${queryString}`);
    
    return { 
      contacts,
      filtered: true,
      filterCriteria: { ...options }
    };
  }
  
  // Otherwise use the standard endpoint
  const contacts = await client.getContacts();
  
  // Apply client-side pagination if requested
  if (options.page && options.perPage) {
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    return {
      contacts: contacts.slice(startIndex, endIndex),
      page: options.page,
      perPage: options.perPage,
      totalCount: contacts.length,
      totalPages: Math.ceil(contacts.length / options.perPage)
    };
  }
  
  return { contacts };
}

export async function createContact(contactData: z.infer<typeof CreateContactSchema>) {
  const client = getClient();
  return await client.request('post', 'contacts', { contact: contactData });
}

export async function updateContact(id: string, contactData: Partial<z.infer<typeof CreateContactSchema>>) {
  const client = getClient();
  return await client.request('put', `contacts/${id}`, { contact: contactData });
} 