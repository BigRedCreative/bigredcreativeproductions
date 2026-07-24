import { services } from "@/data/services";
import { createProductAction } from "@/server/mutate-product";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const mediaAssets = await getActiveImageAssetsForPicker();

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
