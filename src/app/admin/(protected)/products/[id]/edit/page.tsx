import { notFound } from "next/navigation";
import { getProductById } from "@/server/queries/catalog";
import { services } from "@/data/services";
import { updateProductAction } from "@/server/mutate-product";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import ProductForm from "@/components/admin/ProductForm";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

// Loads by permanent id, never slug — the id is stable identity, the slug
// is editable public URL state. See CLAUDE.md "Product admin +
// database-backed catalog".
export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const [product, mediaAssets] = await Promise.all([getProductById(id), getActiveImageAssetsForPicker()]);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="admin-page-heading">Edit {product.title}</h1>
      <ProductForm
        action={updateProductAction.bind(null, id)}
        initialProduct={product}
        services={services.map((service) => ({ slug: service.slug, title: service.title }))}
        mediaAssets={mediaAssets}
        submitLabel="Save Changes"
      />
    </div>
  );
}
