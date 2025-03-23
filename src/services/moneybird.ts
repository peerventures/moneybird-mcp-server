import axios, { AxiosInstance } from 'axios';

export class MoneybirdClient {
  private client: AxiosInstance;
  private administrationId: string;

  constructor(apiToken: string, administrationId: string, timeout = 30000) {
    this.administrationId = administrationId;
    this.client = axios.create({
      baseURL: 'https://moneybird.com/api/v2',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: timeout
    });
  }

  // Financial Accounts
  async getFinancialAccounts() {
    const response = await this.client.get(`/${this.administrationId}/financial_accounts`);
    return response.data;
  }

  // Contacts
  async getContacts() {
    const response = await this.client.get(`/${this.administrationId}/contacts`);
    return response.data;
  }

  async getContact(id: string) {
    const response = await this.client.get(`/${this.administrationId}/contacts/${id}`);
    return response.data;
  }

  // Sales Invoices
  async getSalesInvoices() {
    const response = await this.client.get(`/${this.administrationId}/sales_invoices`);
    return response.data;
  }

  async getSalesInvoice(id: string) {
    const response = await this.client.get(`/${this.administrationId}/sales_invoices/${id}`);
    return response.data;
  }

  // Products
  async getProducts() {
    const response = await this.client.get(`/${this.administrationId}/products`);
    return response.data;
  }

  // Projects
  async getProjects() {
    const response = await this.client.get(`/${this.administrationId}/projects`);
    return response.data;
  }

  // Time entries
  async getTimeEntries() {
    const response = await this.client.get(`/${this.administrationId}/time_entries`);
    return response.data;
  }

  // Generic request method
  async request(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any) {
    // Remove leading slash if present to avoid double slashes
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    const response = await this.client.request({
      method,
      url: `/${this.administrationId}/${normalizedPath}`,
      data
    });
    
    return response.data;
  }
} 