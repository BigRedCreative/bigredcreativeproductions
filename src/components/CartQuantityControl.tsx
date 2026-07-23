type CartQuantityControlProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  label: string;
};

export default function CartQuantityControl({ quantity, onChange, label }: CartQuantityControlProps) {
  return (
    <div className="cart-quantity" role="group" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        className="cart-quantity-button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        aria-label={`Decrease quantity for ${label}`}
      >
        −
      </button>
      <span className="cart-quantity-value" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="cart-quantity-button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`Increase quantity for ${label}`}
      >
        +
      </button>
    </div>
  );
}
