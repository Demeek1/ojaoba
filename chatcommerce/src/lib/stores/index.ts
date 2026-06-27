/**
 * Store abstraction: pull a vendor's catalog from whatever platform they use
 * (Shopify, WooCommerce/WordPress, or manual) into our normalized products table.
 */

export interface NormalizedProduct {
  externalId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stock: number | null;
}

export interface StoreConnector {
  provider: 'shopify' | 'woocommerce' | 'manual';
  /** Fetch all products using the (decrypted) credentials for this store. */
  fetchProducts(domain: string, creds: Record<string, any>): Promise<NormalizedProduct[]>;
}

import { shopify } from './shopify';
import { woocommerce } from './woocommerce';

const registry: Record<string, StoreConnector> = { shopify, woocommerce };

export function getStore(provider: string): StoreConnector | null {
  return registry[provider] ?? null;
}

export const SUPPORTED_STORES = ['shopify', 'woocommerce', 'manual'];
