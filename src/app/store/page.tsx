import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import StoreGrid from "@/components/StoreGrid";
import SectionHeading from "@/components/ui/SectionHeading";
import { getPublishedProducts } from "@/server/queries/catalog";
import { storeIntro } from "@/data/store";

export const metadata: Metadata = {
  title: storeIntro.seo.title,
  description: storeIntro.seo.description,
};

// Time-based fallback only — the real freshness mechanism is
// revalidatePath("/store") called directly from every admin product
// mutation (see src/server/mutate-product.ts). This just guards against a
// missed revalidation call (e.g. a direct DB edit outside the admin UI).
export const revalidate = 3600;

export default async function StorePage() {
  const products = await getPublishedProducts();

  return (
    <BrandTokens>
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
    </BrandTokens>
  );
}
