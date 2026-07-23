import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductHero from "@/components/ProductHero";
import ProductMedia from "@/components/ProductMedia";
import ProductDetails from "@/components/ProductDetails";
import ProductPricing from "@/components/ProductPricing";
import ProductOptions from "@/components/ProductOptions";
import ProductPackages from "@/components/ProductPackages";
import ProductAddOns from "@/components/ProductAddOns";
import ProductCTA from "@/components/ProductCTA";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import { getPublishedProducts, getProductBySlug } from "@/data/products";
import { isCartEligible } from "@/data/cart";

// Only the slugs returned by generateStaticParams are valid — anything else
// 404s instead of attempting an on-demand render. Draft and archived
// products are excluded here, so their slugs never generate a public route.
export const dynamicParams = false;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
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
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const gallery = product.media.slice(1);
  const eligible = isCartEligible(product);

  return (
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
  );
}
