import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { studio } from "@/data/homepage";
import { getPublishedMotionSettings, getDraftMotionSettings } from "@/server/queries/motion";
import SectionHeading from "./ui/SectionHeading";
import MotionSection from "./MotionSection";

type StudioProps = {
  motionVariant?: "published" | "draft";
};

export default async function Studio({ motionVariant = "published" }: StudioProps = {}) {
  const motion = motionVariant === "draft" ? await getDraftMotionSettings() : await getPublishedMotionSettings();
  return (
    <section className="studio section" id={sectionAnchors.studio}>
      <SectionHeading
        wrapperClassName="studio-title"
        kicker={studio.kicker}
        heading={studio.heading}
      />
      <MotionSection preset={motion.studioPreset} intensity={motion.intensity} className="studio-copy">
        <p>
          {siteConfig.name} {studio.introSuffix}
        </p>
        <p>{studio.secondParagraph}</p>
        <div className="principles">
          {studio.principles.map((principle) => (
            <span key={principle}>{principle}</span>
          ))}
        </div>
      </MotionSection>
    </section>
  );
}
