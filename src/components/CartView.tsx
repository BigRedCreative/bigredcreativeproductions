"use client";

import { useCart } from "./CartProvider";
import CartItemRow from "./CartItemRow";
import CartSummary from "./CartSummary";
import CartEmptyState from "./CartEmptyState";

export default function CartView() {
  const { items } = useCart();

  if (items.length === 0) {
    return <CartEmptyState />;
  }

  return (
    <div className="cart-layout">
      <div className="cart-list">
        {items.map((item) => (
          <CartItemRow key={item.cartLineId} item={item} />
        ))}
      </div>
      <CartSummary items={items} />
    </div>
  );
}
