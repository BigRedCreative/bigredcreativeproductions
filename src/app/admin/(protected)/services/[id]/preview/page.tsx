import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import ServiceHero from "@/components/ServiceHero";
import ServiceCapabilities from "@/components/ServiceCapabilities";
import ServiceDeliverables from "@/components/ServiceDeliverables";
import ServiceProcess from "@/components/ServiceProcess";
import ServiceCTA from "@/components/ServiceCTA";
import { getServiceEntityForAdmin } from "@/server/queries/services";

type ServicePreviewPageProps = {
  params: Promise<{ id: string }>;
};

// Admin-authenticated preview only — reachable exclusively through /admin
// (this route sits inside the protected route group, so requireAdminUser()
// already ran in the layout). Reuses the EXACT same public components the
// live /services/[slug] page renders, passed the DRAFT service, so what's
// shown here is genuinely what publishing will make live — not a
// reconstruction. No public secret-token preview exists or is planned,
// matching the exact principle already established by every prior admin
// preview (products, homepage hero, brand).
export default async function AdminServicePreviewPage({ params }: ServicePreviewPageProps) {
  const { id } = await params;
  const service = await getServiceEntityForAdmin(id);

  if (!service) {
    notFound();
  }

  return (
    <div>
      <div className="admin-preview-banner">
        <Link href={`/admin/services/${id}`}>← Back to admin</Link>
        <span>Previewing this service&apos;s private draft — not a public URL</span>
      </div>
      <BrandTokens>
        <main>
          <Header />
          <ServiceHero service={service.draft} />
          <ServiceCapabilities service={service.draft} />
          <ServiceDeliverables service={service.draft} />
          <ServiceProcess service={service.draft} />
          <ServiceCTA service={service.draft} />
          <Footer />
        </main>
      </BrandTokens>
    </div>
  );
}
