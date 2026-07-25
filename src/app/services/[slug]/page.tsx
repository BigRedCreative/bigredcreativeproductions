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
import { getPublishedServices, getServiceBySlug } from "@/server/queries/services";

// Published slugs known at build time are pre-rendered; anything else (a
// service published since the last build) renders on demand instead of
// 404ing — publishing must not require a redeploy. See CLAUDE.md "Services
// + Portfolio Admin". Was `false` pre-cutover, when this route was still
// backed by the static services.ts array.
export const dynamicParams = true;

// Time-based fallback only, matching Store/Product's exact established
// pattern — no admin mutation UI exists yet to call revalidatePath()
// directly, so this is what picks up any future content change until that
// admin UI ships.
export const revalidate = 3600;

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const services = await getPublishedServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
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
  const service = await getServiceBySlug(slug);

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
