import { z } from 'zod';
import { getClient } from '../services/client.js';
import { MoneybirdClient } from '../services/moneybird.js';

export const GenericRequestSchema = z.object({
  method: z.enum(['get', 'post', 'put', 'delete']).describe('HTTP method for the request'),
  path: z.string().describe('API path to request, relative to the base API URL'),
  data: z.any().optional().describe('Optional data to send with the request'),
});

export async function makeGenericRequest(options: z.infer<typeof GenericRequestSchema>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.request(options.method, options.path, options.data);
}