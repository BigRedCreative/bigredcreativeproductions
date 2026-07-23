import "server-only";
import { getProductById } from "@/data/products";
import type { Product } from "@/data/products";

// The ONE place order creation resolves "the authoritative product" — see
// CLAUDE.md "Backend + database foundation". Backed by products.ts today,
// since the public storefront still reads from there (the products table
// exists but isn't the live catalog yet). Swap this implementation to
// query the database once the catalog migrates; nothing that calls
// getAuthoritativeProduct() needs to change. Deliberately async even
// though today's implementation is synchronous, so that swap is a
// non-breaking change for every caller.
export async function getAuthoritativeProduct(productId: string): Promise<Product | undefined> {
  return getProductById(productId);
}
