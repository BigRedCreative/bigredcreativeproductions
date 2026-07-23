"use client";

import Link from "next/link";
import type { CartItem } from "@/data/cart";
import { calculateLineSubtotal } from "@/data/cart-pricing";
import { formatMoney } from "@/data/money";
import { productHref } from "@/data/products";
import { useCart } from "./CartProvider";
import CartQuantityControl from "./CartQuantityControl";

type CartItemRowProps = {
  item: CartItem;
};

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();
  const lineSubtotal = calculateLineSubtotal(item);
  const isEstimate = item.purchaseMode === "starting-price";

  return (
    <article className="cart-item">
      <div className="cart-item-info">
        <Link href={productHref(item.productSlug)} className="cart-item-title">
          {item.productTitle}
        </Link>
        <dl className="cart-item-config">
          {item.selectedPackage && (
            <div>
              <dt>Package</dt>
              <dd>{item.selectedPackage.label}</dd>
            </div>
          )}
          {item.selectedOptions.map((option) => (
            <div key={option.optionKey}>
              <dt>{option.optionLabel}</dt>
              <dd>{option.valueLabel}</dd>
            </div>
          ))}
          {item.selectedAddOns.length > 0 && (
            <div>
              <dt>Add-ons</dt>
              <dd>{item.selectedAddOns.map((addOn) => addOn.label).join(", ")}</dd>
            </div>
          )}
        </dl>
        {isEstimate && <p className="cart-item-estimate">Starting price — final price subject to confirmation</p>}
      </div>

      <CartQuantityControl
        quantity={item.quantity}
        onChange={(quantity) => updateQuantity(item.cartLineId, quantity)}
        label={item.productTitle}
      />

      <div className="cart-item-price">
        <p className="cart-item-subtotal">
          {isEstimate ? "Est. " : ""}
          {formatMoney(lineSubtotal)}
        </p>
        {item.depositAmount !== undefined && (
          <p className="cart-item-deposit">{formatMoney(item.depositAmount)} deposit</p>
        )}
      </div>

      <button
        type="button"
        className="cart-item-remove"
        onClick={() => removeItem(item.cartLineId)}
        aria-label={`Remove ${item.productTitle} from cart`}
      >
        Remove
      </button>
    </article>
  );
}
