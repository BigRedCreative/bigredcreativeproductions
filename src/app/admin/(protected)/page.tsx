import { getOrderStatusCounts } from "@/server/queries/orders";
import { getCustomerCount } from "@/server/queries/customers";

// Real Neon counts only — an empty database correctly shows zeros. No
// seeded/fake metrics, no revenue (no payment data exists yet to compute
// it from).
export default async function AdminDashboardPage() {
  const [statusCounts, customerCount] = await Promise.all([getOrderStatusCounts(), getCustomerCount()]);

  const totalOrders = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  const metrics = [
    { label: "Total orders", value: totalOrders },
    { label: "Submitted", value: statusCounts["submitted"] ?? 0 },
    { label: "Needs review", value: statusCounts["needs-review"] ?? 0 },
    { label: "Confirmed", value: statusCounts["confirmed"] ?? 0 },
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
