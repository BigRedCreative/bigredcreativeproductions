import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import ServiceHero from "@/components/ServiceHero";
import ServiceCapabilities from "@/components/ServiceCapabilities";
import ServiceDeliverables from "@/components/ServiceDeliverables";
import ServiceProcess from "@/components/ServiceProcess";
import ServiceCTA from "@/components/ServiceCTA";
import { services, getServiceBySlug } from "@/data/services";

// Only the slugs returned by generateStaticParams are valid — anything else
// 404s instead of attempting an on-demand render.
export const dynamicParams = false;

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) {
    return {};
  }
  return {
    title: service.seo.title,
    description: service.seo.description,
    openGraph: {
      title: service.title,
      description: service.seo.description,
      type: "website",
    },
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <BrandTokens>
      <main>
        <Header />
        <ServiceHero service={service} />
        <ServiceCapabilities service={service} />
        <ServiceDeliverables service={service} />
        <ServiceProcess service={service} />
        <ServiceCTA service={service} />
        <Footer />
      </main>
    </BrandTokens>
  );
}
