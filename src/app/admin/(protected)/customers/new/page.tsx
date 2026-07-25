import Link from "next/link";
import { getLeadById } from "@/server/queries/leads";
import { splitLeadName } from "@/server/build-customer-form";
import { createCustomerAction } from "@/server/mutate-customer";
import CustomerForm from "@/components/admin/CustomerForm";

type NewCustomerPageProps = {
  searchParams: Promise<{ fromLead?: string }>;
};

// Reached either directly ("New Customer" from /admin/customers) or via
// "Create Customer from Lead" on a lead's detail page (?fromLead=<id>) —
// in the latter case the form is prefilled from the lead's own data, but
// nothing is written until the admin reviews/edits and submits. The actual
// lead-linking happens inside createCustomerAction's single transaction,
// not here.
export default async function AdminNewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const { fromLead } = await searchParams;

  let initialCustomer: { firstName: string; lastName: string; email: string; phone: string | null; company: string | null } | undefined;

  if (fromLead) {
    const lead = await getLeadById(fromLead);
    if (lead) {
      const { firstName, lastName } = splitLeadName(lead.name);
      initialCustomer = { firstName, lastName, email: lead.email, phone: lead.phone, company: lead.company };
    }
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/customers">← Customers</Link>
      </p>
      <h1 className="admin-page-heading">New Customer</h1>
      {fromLead && (
        <p className="admin-form-section-help">
          Prefilled from the linked lead — review the name split and edit anything before saving.
        </p>
      )}
      <CustomerForm action={createCustomerAction} initialCustomer={initialCustomer} fromLeadId={fromLead} submitLabel="Create Customer" />
    </div>
  );
}
