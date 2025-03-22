import { z } from 'zod';
import { getClient } from '../services/client';

export const GetContactSchema = z.object({
  id: z.string().describe('The ID of the contact to retrieve'),
});

export const ListContactsSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
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

export async function getContact(id: string) {
  const client = getClient();
  return await client.getContact(id);
}

export async function listContacts(page?: number, perPage?: number) {
  const client = getClient();
  const contacts = await client.getContacts();
  
  // Basic pagination if requested
  if (page && perPage) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return {
      contacts: contacts.slice(startIndex, endIndex),
      page,
      perPage,
      totalCount: contacts.length,
      totalPages: Math.ceil(contacts.length / perPage)
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
  return await client.request('patch', `contacts/${id}`, { contact: contactData });
} 