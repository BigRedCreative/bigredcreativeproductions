import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/server/queries/customers";
import { updateCustomerAction } from "@/server/mutate-customer";
import CustomerForm from "@/components/admin/CustomerForm";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href={`/admin/customers/${id}`}>
          ← {customer.firstName} {customer.lastName}
        </Link>
      </p>
      <h1 className="admin-page-heading">Edit Customer</h1>
      <CustomerForm action={updateCustomerAction.bind(null, id)} initialCustomer={customer} submitLabel="Save Changes" />
    </div>
  );
}
