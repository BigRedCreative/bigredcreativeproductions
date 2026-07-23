import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreGrid from "@/components/StoreGrid";
import SectionHeading from "@/components/ui/SectionHeading";
import { getPublishedProducts } from "@/data/products";
import { storeIntro } from "@/data/store";

export const metadata: Metadata = {
  title: storeIntro.seo.title,
  description: storeIntro.seo.description,
};

export default function StorePage() {
  const products = getPublishedProducts();

  return (
    <main>
      <Header />
      <section className="section">
        <SectionHeading
          wrapperClassName="section-top"
          kicker={storeIntro.kicker}
          heading={storeIntro.heading}
          description={storeIntro.intro}
        />
        <StoreGrid products={products} />
      </section>
      <Footer />
    </main>
  );
}
