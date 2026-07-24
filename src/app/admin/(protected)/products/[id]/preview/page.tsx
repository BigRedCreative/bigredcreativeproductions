import Link from "next/link";
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
import { getProductById } from "@/server/queries/catalog";
import StatusBadge from "@/components/admin/StatusBadge";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

// Admin-authenticated preview only — reachable exclusively through
// /admin (this route sits inside the protected route group, so
// requireAdminUser() already ran in the layout). Deliberately reuses the
// EXACT same public rendering components /store/[slug] uses, sourced via
// the admin getProductById() (works for any status) instead of the
// published-only public path — what you see here is genuinely what the
// public page will render, not a reconstruction of it. No public
// secret-token preview exists or is planned; this is the only preview
// mechanism.
export default async function AdminProductPreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const gallery = product.media.slice(1);

  return (
    <div>
      <div className="admin-preview-banner">
        <Link href={`/admin/products/${id}`}>← Back to admin</Link>
        <span>
          Previewing <StatusBadge status={product.status} /> — not a public URL
        </span>
      </div>
      <main>
        <Header />
        <ProductHero product={product} />
        {gallery.length > 0 && <ProductMedia media={gallery} />}
        <ProductDetails product={product} />
        <ProductPricing product={product} />
        {product.options && product.options.length > 0 && <ProductOptions product={product} />}
        {product.packages && product.packages.length > 0 && <ProductPackages product={product} />}
        {product.addOns && product.addOns.length > 0 && <ProductAddOns product={product} />}
        <ProductCTA product={product} />
        <Footer />
      </main>
    </div>
  );
}
