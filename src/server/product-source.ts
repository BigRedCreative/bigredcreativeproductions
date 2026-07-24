import "server-only";
import { getProductById } from "@/server/queries/catalog";
import type { Product } from "@/data/products";

// The ONE place order creation resolves "the authoritative product" — see
// CLAUDE.md "Product admin + database-backed catalog". As of Phase 13,
// Neon is the real, sole authoritative catalog — getProductById() here
// queries the live `products` table (see src/server/queries/catalog.ts),
// searching the full catalog regardless of status so a since-archived
// product a client references can still be resolved and correctly
// rejected (rather than looking like "not found"). This was already
// async in the pre-database implementation specifically so this swap
// would be a non-breaking change for every caller — POST /api/orders did
// not need to change at all.
export async function getAuthoritativeProduct(productId: string): Promise<Product | undefined> {
  return getProductById(productId);
}
