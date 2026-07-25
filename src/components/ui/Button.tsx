import type { ReactNode } from "react";

type ButtonProps = {
  href?: string;
  type?: "button" | "submit" | "reset";
  className?: string;
  ariaLabel?: string;
  // Optional, only meaningful for the <button> (non-href) form — e.g. a
  // submit button disabled while its action is pending. Backward
  // compatible: every existing call site omits this and behaves exactly
  // as before.
  disabled?: boolean;
  children: ReactNode;
};

export default function Button({ href, type, className, ariaLabel, disabled, children }: ButtonProps) {
  if (href) {
    return (
      <a href={href} className={className} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={className} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  );
}
