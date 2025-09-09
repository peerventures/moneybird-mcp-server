import { z } from 'zod';
import { getClient } from '../services/client.js';
import { MoneybirdClient } from '../services/moneybird.js';

export const GetProductSchema = z.object({
  id: z.string().describe('The ID of the product to retrieve'),
});

export const ListProductsSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
});

export const CreateProductSchema = z.object({
  title: z.string().describe('Title of the product'),
  description: z.string().optional().describe('Description of the product'),
  price: z.number().describe('Price of the product'),
  tax_rate_id: z.string().optional().describe('Tax rate ID'),
  ledger_account_id: z.string().optional().describe('Ledger account ID'),
  active: z.boolean().optional().describe('Whether the product is active'),
  product_type: z.enum(['product', 'service']).optional().describe('Type of product'),
});

export const UpdateProductSchema = GetProductSchema.extend({
  ...CreateProductSchema.shape,
});

export async function getProduct(id: string, client?: MoneybirdClient) {
  const resolved = client || getClient();
  const products = await resolved.getProducts();
  const product = products.find((product: any) => product.id === id);
  
  if (!product) {
    throw new Error(`Product with ID ${id} not found`);
  }
  
  return product;
}

export async function listProducts(options?: z.infer<typeof ListProductsSchema>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  const products = await resolved.getProducts();
  
  // Basic pagination if requested
  if (options?.page && options?.perPage) {
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    return {
      products: products.slice(startIndex, endIndex),
      page: options.page,
      perPage: options.perPage,
      totalCount: products.length,
      totalPages: Math.ceil(products.length / options.perPage)
    };
  }
  
  return { products };
}

export async function createProduct(productData: z.infer<typeof CreateProductSchema>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.request('post', 'products', { product: productData });
}

export async function updateProduct(id: string, productData: Partial<z.infer<typeof CreateProductSchema>>, client?: MoneybirdClient) {
  const resolved = client || getClient();
  return await resolved.request('put', `products/${id}`, { product: productData });
}