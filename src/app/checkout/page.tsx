import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutView from "@/components/CheckoutView";
import SectionHeading from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Checkout | Big Red Creative Productions",
  description: "Review your order and submit your request.",
};

export default function CheckoutPage() {
  return (
    <main>
      <Header />
      <section className="section">
        <SectionHeading wrapperClassName="section-top" kicker="Checkout" heading="Review your order" />
        <CheckoutView />
      </section>
      <Footer />
    </main>
  );
}
