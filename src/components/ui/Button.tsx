import type { ReactNode } from "react";

type ButtonProps = {
  href?: string;
  type?: "button" | "submit" | "reset";
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export default function Button({ href, type, className, ariaLabel, children }: ButtonProps) {
  if (href) {
    return (
      <a href={href} className={className} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
