import type { ElementType, ReactNode } from "react";

type BadgeProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export default function Badge({ as: Tag = "span", className, children }: BadgeProps) {
  return <Tag className={className}>{children}</Tag>;
}
