import { process } from "@/data/homepage";
import { getPublishedMotionSettings, getDraftMotionSettings } from "@/server/queries/motion";
import MotionSection from "./MotionSection";

type ProcessProps = {
  motionVariant?: "published" | "draft";
};

export default async function Process({ motionVariant = "published" }: ProcessProps = {}) {
  const motion = motionVariant === "draft" ? await getDraftMotionSettings() : await getPublishedMotionSettings();
  return (
    <section className="process section">
      <span className="kicker">{process.kicker}</span>
      <MotionSection preset={motion.processPreset} intensity={motion.intensity} stagger={motion.processStagger} className="process-grid">
        {process.steps.map((step) => (
          <article key={step.number}>
            <b>{step.number}</b>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </article>
        ))}
      </MotionSection>
    </section>
  );
}
