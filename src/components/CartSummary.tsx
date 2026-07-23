import Link from "next/link";
import type { CartItem } from "@/data/cart";
import {
  calculateCartDepositDue,
  calculateCartItemCount,
  calculateCartSubtotal,
  cartHasEstimatedPricing,
} from "@/data/cart-pricing";
import { formatMoney } from "@/data/money";

type CartSummaryProps = {
  items: CartItem[];
};

export default function CartSummary({ items }: CartSummaryProps) {
  const subtotal = calculateCartSubtotal(items);
  const depositDue = calculateCartDepositDue(items);
  const itemCount = calculateCartItemCount(items);
  const hasEstimate = cartHasEstimatedPricing(items);

  return (
    <div className="cart-summary">
      <div className="cart-summary-row">
        <span>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
        <span>{hasEstimate ? "Estimated subtotal" : "Subtotal"}</span>
      </div>
      <p className="cart-summary-total">{formatMoney(subtotal)}</p>
      {depositDue > 0 && (
        <div className="cart-summary-row cart-summary-deposit">
          <span>Deposit due now</span>
          <span>{formatMoney(depositDue)}</span>
        </div>
      )}
      {hasEstimate && (
        <p className="cart-summary-note">
          Some items are starting prices — final price subject to confirmation.
        </p>
      )}
      <Link href="/checkout" className="cart-checkout-button">
        Continue to Checkout
      </Link>
    </div>
  );
}
