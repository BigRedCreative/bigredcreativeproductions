import Link from "next/link";
import { STORE_INDEX_HREF } from "@/data/products";

export default function CartEmptyState() {
  return (
    <div className="store-empty">
      <p className="store-empty-heading">Your cart is empty.</p>
      <p>Browse the store to find products and packages worth adding.</p>
      <Link href={STORE_INDEX_HREF} className="cart-continue-shopping">
        Continue shopping →
      </Link>
    </div>
  );
}
