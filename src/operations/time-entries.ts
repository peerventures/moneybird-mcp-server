import { z } from 'zod';
import { getClient } from '../services/client.js';

export const GetTimeEntrySchema = z.object({
  id: z.string().describe('The ID of the time entry to retrieve'),
});

export const ListTimeEntriesSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
  projectId: z.string().optional().describe('Filter by project ID'),
  startDate: z.string().optional().describe('Filter by start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('Filter by end date (YYYY-MM-DD)'),
});

export const CreateTimeEntrySchema = z.object({
  project_id: z.string().describe('Project ID for this time entry'),
  description: z.string().describe('Description of the time entry'),
  started_at: z.string().describe('Start time (ISO format: YYYY-MM-DDTHH:MM:SS)'),
  ended_at: z.string().optional().describe('End time (ISO format: YYYY-MM-DDTHH:MM:SS)'),
  note: z.string().optional().describe('Additional notes'),
  billable: z.boolean().optional().describe('Whether the time entry is billable'),
  price: z.number().optional().describe('Price per hour'),
});

export const UpdateTimeEntrySchema = GetTimeEntrySchema.extend({
  ...CreateTimeEntrySchema.shape,
});

export async function getTimeEntry(id: string) {
  const client = getClient();
  const entries = await client.getTimeEntries();
  const entry = entries.find((entry: any) => entry.id === id);
  
  if (!entry) {
    throw new Error(`Time entry with ID ${id} not found`);
  }
  
  return entry;
}

export async function listTimeEntries(options?: z.infer<typeof ListTimeEntriesSchema>) {
  const client = getClient();
  const entries = await client.getTimeEntries();
  
  // Apply filters if provided
  let filteredEntries = entries;
  
  if (options?.projectId) {
    filteredEntries = filteredEntries.filter((entry: any) => entry.project_id === options.projectId);
  }
  
  // Filter by date range if provided
  if (options?.startDate) {
    const startDate = new Date(options.startDate);
    filteredEntries = filteredEntries.filter((entry: any) => {
      const entryDate = new Date(entry.started_at);
      return entryDate >= startDate;
    });
  }
  
  if (options?.endDate) {
    const endDate = new Date(options.endDate);
    filteredEntries = filteredEntries.filter((entry: any) => {
      const entryDate = new Date(entry.started_at);
      return entryDate <= endDate;
    });
  }
  
  // Basic pagination if requested
  if (options?.page && options?.perPage) {
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    return {
      timeEntries: filteredEntries.slice(startIndex, endIndex),
      page: options.page,
      perPage: options.perPage,
      totalCount: filteredEntries.length,
      totalPages: Math.ceil(filteredEntries.length / options.perPage)
    };
  }
  
  return { timeEntries: filteredEntries };
}

export async function createTimeEntry(timeEntryData: z.infer<typeof CreateTimeEntrySchema>) {
  const client = getClient();
  return await client.request('post', 'time_entries', { time_entry: timeEntryData });
}

export async function updateTimeEntry(id: string, timeEntryData: Partial<z.infer<typeof CreateTimeEntrySchema>>) {
  const client = getClient();
  return await client.request('put', `time_entries/${id}`, { time_entry: timeEntryData });
}

export async function deleteTimeEntry(id: string) {
  const client = getClient();
  return await client.request('delete', `time_entries/${id}`);
} 