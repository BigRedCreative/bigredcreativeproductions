import { getPublishedServices } from "@/server/queries/services";
import { createProductAction } from "@/server/mutate-product";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const [mediaAssets, services] = await Promise.all([getActiveImageAssetsForPicker(), getPublishedServices()]);

  return (
    <div>
      <h1 className="admin-page-heading">New Product</h1>
      <ProductForm
        action={createProductAction}
        services={services.map((service) => ({ slug: service.slug, title: service.title }))}
        mediaAssets={mediaAssets}
        submitLabel="Create Product"
      />
    </div>
  );
}
