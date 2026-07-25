import { getOrderStatusCounts, getPaymentStatusCounts } from "@/server/queries/orders";
import { getCustomerCount } from "@/server/queries/customers";
import { getLeadStatusCounts } from "@/server/queries/leads";

// Real Neon counts only — an empty database correctly shows zeros. No
// seeded/fake metrics, no revenue (no payment data exists yet to compute
// it from). "Active projects" groups the three in-flight work statuses;
// this replaces the stale Phase 12-era "Confirmed" metric, which no
// longer exists in the approved 8-value lifecycle (replaced by
// "approved").
export default async function AdminDashboardPage() {
  const [statusCounts, paymentStatusCounts, customerCount, leadCounts] = await Promise.all([
    getOrderStatusCounts(),
    getPaymentStatusCounts(),
    getCustomerCount(),
    getLeadStatusCounts(),
  ]);

  const totalOrders = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const activeProjects =
    (statusCounts["approved"] ?? 0) + (statusCounts["in-progress"] ?? 0) + (statusCounts["awaiting-client"] ?? 0);

  const metrics = [
    { label: "New leads", value: leadCounts.newCount },
    { label: "Needs follow-up", value: leadCounts.needsFollowUpCount },
    { label: "Total orders", value: totalOrders },
    { label: "Active projects", value: activeProjects },
    { label: "Awaiting client", value: statusCounts["awaiting-client"] ?? 0 },
    { label: "Unpaid orders", value: paymentStatusCounts["unpaid"] ?? 0 },
    { label: "Deposit paid", value: paymentStatusCounts["deposit-paid"] ?? 0 },
    { label: "Customers", value: customerCount },
  ];

  return (
    <div>
      <h1 className="admin-page-heading">Dashboard</h1>
      <div className="admin-metrics">
        {metrics.map((metric) => (
          <div className="admin-metric" key={metric.label}>
            <div className="admin-metric-value">{metric.value}</div>
            <div className="admin-metric-label">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
