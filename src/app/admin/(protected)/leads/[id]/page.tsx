import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadById } from "@/server/queries/leads";
import { searchCustomers } from "@/server/queries/customers";
import StatusBadge from "@/components/admin/StatusBadge";
import LeadStatusForm from "@/components/admin/LeadStatusForm";
import LeadArchiveToggle from "@/components/admin/LeadArchiveToggle";
import LinkCustomerButton from "@/components/admin/LinkCustomerButton";
import NoteForm from "@/components/admin/NoteForm";
import NotesList from "@/components/admin/NotesList";
import { addLeadNoteAction } from "@/server/mutate-lead";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ customerQuery?: string }>;
};

export default async function AdminLeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const { id } = await params;
  const { customerQuery } = await searchParams;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const customerResults = !lead.customer && customerQuery ? await searchCustomers(customerQuery) : [];

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/leads">← Leads</Link>
      </p>
      <h1 className="admin-page-heading">
        {lead.name} <StatusBadge status={lead.status} />
        {lead.archivedAt && <span className="admin-badge admin-badge-archived">archived</span>}
      </h1>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Inquiry</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Requested service</span>
              <span>{lead.requestedService ?? "—"}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Source</span>
              <span>{lead.source}</span>
            </div>
            <p className="admin-line-item-title">Message</p>
            <p>{lead.message}</p>
          </div>

          <div className="admin-detail-block">
            <h2>Notes</h2>
            <NotesList notes={lead.notes} />
            <NoteForm action={addLeadNoteAction.bind(null, lead.id)} />
          </div>
        </div>

        <div>
          <div className="admin-detail-block">
            <h2>Contact</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Name</span>
              <span>{lead.name}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Email</span>
              <span>{lead.email}</span>
            </div>
            {lead.phone && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Phone</span>
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.company && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Company</span>
                <span>{lead.company}</span>
              </div>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Customer</h2>
            {lead.customer ? (
              <>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Linked customer</span>
                  <span>
                    <Link href={`/admin/customers/${lead.customer.id}`}>
                      {lead.customer.firstName} {lead.customer.lastName}
                    </Link>
                  </span>
                </div>
                <p className="admin-form-actions">
                  <Link href={`/admin/customers/${lead.customer.id}`} className="admin-secondary-button">
                    View Customer
                  </Link>
                  <Link href={`/admin/orders/new?customerId=${lead.customer.id}`} className="admin-secondary-button">
                    Create Order for Customer
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="admin-form-section-help">This lead isn&apos;t linked to a customer yet.</p>
                <p className="admin-form-actions">
                  <Link href={`/admin/customers/new?fromLead=${lead.id}`} className="admin-secondary-button">
                    Create Customer from Lead
                  </Link>
                </p>

                <form method="GET" className="admin-filter-bar">
                  <input
                    type="search"
                    name="customerQuery"
                    placeholder="Search existing customers by name, email, company…"
                    defaultValue={customerQuery ?? ""}
                    className="admin-filter-input"
                    aria-label="Search existing customers"
                  />
                  <button type="submit" className="admin-signout-button">
                    Search
                  </button>
                </form>

                {customerQuery && (
                  customerResults.length === 0 ? (
                    <p className="admin-empty-state">No matching customers found.</p>
                  ) : (
                    customerResults.map((customer) => (
                      <div className="admin-line-item" key={customer.id}>
                        <p className="admin-line-item-title">{customer.name}</p>
                        <p className="admin-line-item-meta">
                          {customer.email}
                          {customer.company ? ` · ${customer.company}` : ""}
                        </p>
                        <LinkCustomerButton leadId={lead.id} customerId={customer.id} />
                      </div>
                    ))
                  )
                )}
              </>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Status</h2>
            <LeadStatusForm id={lead.id} currentStatus={lead.status} />
          </div>

          <div className="admin-detail-block">
            <h2>Archive</h2>
            <LeadArchiveToggle id={lead.id} isArchived={!!lead.archivedAt} />
          </div>

          <div className="admin-detail-block">
            <h2>Timeline</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Lead ID</span>
              <span>{lead.id}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Received</span>
              <span>{lead.createdAt.toLocaleString("en-US")}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Updated</span>
              <span>{lead.updatedAt.toLocaleString("en-US")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
