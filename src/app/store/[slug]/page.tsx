import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import ProductHero from "@/components/ProductHero";
import ProductMedia from "@/components/ProductMedia";
import ProductDetails from "@/components/ProductDetails";
import ProductPricing from "@/components/ProductPricing";
import ProductOptions from "@/components/ProductOptions";
import ProductPackages from "@/components/ProductPackages";
import ProductAddOns from "@/components/ProductAddOns";
import ProductCTA from "@/components/ProductCTA";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import { getPublishedProducts, getProductBySlug } from "@/server/queries/catalog";
import { isCartEligible } from "@/data/cart";

// Published slugs known at build time are pre-rendered; anything else
// (a product published since the last build) renders on demand instead of
// 404ing — publishing through admin must not require a redeploy. See
// CLAUDE.md "Product admin + database-backed catalog".
export const dynamicParams = true;

// Time-based fallback only — the real freshness mechanism is
// revalidatePath() called directly from every admin product mutation (see
// src/server/mutate-product.ts). This just guards against a missed
// revalidation call.
export const revalidate = 3600;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return {};
  }
  return {
    title: product.seo.title,
    description: product.seo.description,
    openGraph: {
      title: product.title,
      description: product.seo.description,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const gallery = product.media.slice(1);
  const eligible = isCartEligible(product);

  return (
    <BrandTokens>
      <main>
        <Header />
        <ProductHero product={product} />
        {gallery.length > 0 && <ProductMedia media={gallery} />}
        <ProductDetails product={product} />
        <ProductPricing product={product} />
        {eligible ? (
          <ProductPurchasePanel product={product} />
        ) : (
          <>
            {product.options && product.options.length > 0 && <ProductOptions product={product} />}
            {product.packages && product.packages.length > 0 && <ProductPackages product={product} />}
            {product.addOns && product.addOns.length > 0 && <ProductAddOns product={product} />}
            <ProductCTA product={product} />
          </>
        )}
        <Footer />
      </main>
    </BrandTokens>
  );
}
