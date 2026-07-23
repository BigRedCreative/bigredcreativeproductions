import type { OrderDraft } from "@/data/orders";
import { formatMoney } from "@/data/money";

type OrderReviewProps = {
  draft: OrderDraft;
};

// Presentational only — renders exclusively from the frozen OrderLine
// snapshots on `draft`, never from a live Product lookup. Deliberately not
// a reuse of CartItemRow, which carries live quantity/remove controls
// wired to useCart() that have no place in a historical review.
export default function OrderReview({ draft }: OrderReviewProps) {
  const { pricingSummary } = draft;

  return (
    <div className="order-review">
      <div className="order-review-lines">
        {draft.lines.map((line) => {
          const isEstimate = line.purchaseMode === "starting-price";
          return (
            <article className="order-review-line" key={line.orderLineId}>
              <div>
                <p className="order-review-title">{line.productTitle}</p>
                <dl className="cart-item-config">
                  {line.selectedPackage && (
                    <div>
                      <dt>Package</dt>
                      <dd>{line.selectedPackage.label}</dd>
                    </div>
                  )}
                  {line.selectedOptions.map((option) => (
                    <div key={option.optionKey}>
                      <dt>{option.optionLabel}</dt>
                      <dd>{option.valueLabel}</dd>
                    </div>
                  ))}
                  {line.selectedAddOns.length > 0 && (
                    <div>
                      <dt>Add-ons</dt>
                      <dd>{line.selectedAddOns.map((addOn) => addOn.label).join(", ")}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Quantity</dt>
                    <dd>{line.quantity}</dd>
                  </div>
                </dl>
                {isEstimate && (
                  <p className="cart-item-estimate">Starting price — final price subject to confirmation</p>
                )}
              </div>
              <div className="order-review-price">
                <p className="cart-item-subtotal">
                  {isEstimate ? "Est. " : ""}
                  {formatMoney(line.lineSubtotal)}
                </p>
                {line.depositAmount !== undefined && (
                  <p className="cart-item-deposit">{formatMoney(line.depositAmount)} deposit expected later</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="cart-summary order-review-summary">
        <div className="cart-summary-row">
          <span>{pricingSummary.hasEstimatedPricing ? "Estimated subtotal" : "Order value"}</span>
          <span>{formatMoney(pricingSummary.subtotal)}</span>
        </div>
        {pricingSummary.depositDue > 0 && (
          <div className="cart-summary-row cart-summary-deposit">
            <span>Deposit expected later</span>
            <span>{formatMoney(pricingSummary.depositDue)}</span>
          </div>
        )}
        {pricingSummary.hasEstimatedPricing ? (
          <p className="cart-summary-note">
            Some items are starting prices. Final price subject to confirmation — no payment is being
            collected.
          </p>
        ) : (
          <p className="cart-summary-note">No payment is being collected at this step.</p>
        )}
      </div>
    </div>
  );
}
