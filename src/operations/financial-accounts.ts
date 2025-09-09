import { z } from 'zod';
import { getClient } from '../services/client.js';
import { MoneybirdClient } from '../services/moneybird.js';

export const GetFinancialAccountSchema = z.object({
  id: z.string().describe('The ID of the financial account to retrieve'),
});

export const ListFinancialAccountsSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
});

export async function getFinancialAccount(id: string, client?: MoneybirdClient) {
  const resolved = client || getClient();
  const accounts = await resolved.getFinancialAccounts();
  const account = accounts.find((account: any) => account.id === id);
  
  if (!account) {
    throw new Error(`Financial account with ID ${id} not found`);
  }
  
  return account;
}

export async function listFinancialAccounts(options?: z.infer<typeof ListFinancialAccountsSchema>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  const accounts = await resolved.getFinancialAccounts();
  
  // Basic pagination if requested
  if (options?.page && options?.perPage) {
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    return {
      accounts: accounts.slice(startIndex, endIndex),
      page: options.page,
      perPage: options.perPage,
      totalCount: accounts.length,
      totalPages: Math.ceil(accounts.length / options.perPage)
    };
  }
  
  return { accounts };
} 