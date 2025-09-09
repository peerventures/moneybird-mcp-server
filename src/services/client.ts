import { MoneybirdClient } from './moneybird.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let clientInstance: MoneybirdClient | null = null;

export function getClient(params?: { moneybird_administration_id?: string; moneybird_api_token?: string }): MoneybirdClient {
  if (!clientInstance) {
    const apiToken = params?.moneybird_api_token || process.env.MONEYBIRD_API_TOKEN;
    const administrationId = params?.moneybird_administration_id || process.env.MONEYBIRD_ADMINISTRATION_ID;

    if (!apiToken) {
      throw new Error('MONEYBIRD_API_TOKEN (or moneybird_api_token param) is required');
    }

    if (!administrationId) {
      throw new Error('MONEYBIRD_ADMINISTRATION_ID (or moneybird_administration_id param) is required');
    }

    clientInstance = new MoneybirdClient(apiToken, administrationId);
  }
  
  return clientInstance;
}

export function resetClient(): void {
  clientInstance = null;
}

export function setClient(instance: MoneybirdClient): void {
  clientInstance = instance;
} 