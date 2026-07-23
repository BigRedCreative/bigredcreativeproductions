"use client";

import Link from "next/link";
import { calculateCartItemCount } from "@/data/cart-pricing";
import { useCart } from "./CartProvider";

export default function CartNavLink() {
  const { items } = useCart();
  const count = calculateCartItemCount(items);

  return <Link href="/cart">Cart ({count})</Link>;
}
