"use client";

import type { OrderCustomer } from "@/data/orders";

type CheckoutCustomerFormProps = {
  customer: OrderCustomer;
  notes: string;
  errors: string[];
  onChange: (customer: OrderCustomer) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
};

export default function CheckoutCustomerForm({
  customer,
  notes,
  errors,
  onChange,
  onNotesChange,
  onSubmit,
}: CheckoutCustomerFormProps) {
  function handleField(field: keyof OrderCustomer, value: string) {
    onChange({ ...customer, [field]: value });
  }

  return (
    <form
      className="checkout-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset>
        <legend>Contact information</legend>
        <label>
          First name
          <input
            name="firstName"
            required
            value={customer.firstName}
            onChange={(event) => handleField("firstName", event.target.value)}
          />
        </label>
        <label>
          Last name
          <input
            name="lastName"
            required
            value={customer.lastName}
            onChange={(event) => handleField("lastName", event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            value={customer.email}
            onChange={(event) => handleField("email", event.target.value)}
          />
        </label>
        <label>
          Phone <span className="checkout-optional">(optional)</span>
          <input
            name="phone"
            type="tel"
            value={customer.phone ?? ""}
            onChange={(event) => handleField("phone", event.target.value)}
          />
        </label>
        <label>
          Company <span className="checkout-optional">(optional)</span>
          <input
            name="company"
            value={customer.company ?? ""}
            onChange={(event) => handleField("company", event.target.value)}
          />
        </label>
        <label>
          Notes <span className="checkout-optional">(optional)</span>
          <textarea name="notes" value={notes} onChange={(event) => onNotesChange(event.target.value)} />
        </label>
      </fieldset>

      {errors.length > 0 && (
        <div className="checkout-errors" role="alert" aria-live="assertive">
          <p>Please fix the following before continuing:</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className="checkout-submit-button">
        Review Order
      </button>
    </form>
  );
}
