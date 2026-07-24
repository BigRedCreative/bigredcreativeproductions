import { services } from "@/data/services";
import { createProductAction } from "@/server/mutate-product";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="admin-page-heading">New Product</h1>
      <ProductForm
        action={createProductAction}
        services={services.map((service) => ({ slug: service.slug, title: service.title }))}
        submitLabel="Create Product"
      />
    </div>
  );
}
