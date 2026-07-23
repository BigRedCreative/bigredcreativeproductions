import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartView from "@/components/CartView";
import SectionHeading from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Cart | Big Red Creative Productions",
  description: "Review your cart before continuing.",
};

export default function CartPage() {
  return (
    <main>
      <Header />
      <section className="section">
        <SectionHeading wrapperClassName="section-top" kicker="Your cart" heading="Cart" />
        <CartView />
      </section>
      <Footer />
    </main>
  );
}
