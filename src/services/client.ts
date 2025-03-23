import { MoneybirdClient } from './moneybird.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let clientInstance: MoneybirdClient | null = null;

export function getClient(): MoneybirdClient {
  if (!clientInstance) {
    const apiToken = process.env.MONEYBIRD_API_TOKEN;
    const administrationId = process.env.MONEYBIRD_ADMINISTRATION_ID;

    if (!apiToken) {
      throw new Error('MONEYBIRD_API_TOKEN environment variable is required');
    }

    if (!administrationId) {
      throw new Error('MONEYBIRD_ADMINISTRATION_ID environment variable is required');
    }

    clientInstance = new MoneybirdClient(apiToken, administrationId);
  }
  
  return clientInstance;
}

export function resetClient(): void {
  clientInstance = null;
} 