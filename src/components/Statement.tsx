import { statement } from "@/data/homepage";
import { getPublishedMotionSettings, getDraftMotionSettings } from "@/server/queries/motion";
import Badge from "./ui/Badge";
import MotionSection from "./MotionSection";

type StatementProps = {
  motionVariant?: "published" | "draft";
};

export default async function Statement({ motionVariant = "published" }: StatementProps = {}) {
  const motion = motionVariant === "draft" ? await getDraftMotionSettings() : await getPublishedMotionSettings();
  return (
    <section className="statement grain">
      <MotionSection preset={motion.statementPreset} intensity={motion.intensity}>
        <Badge as="div" className="statement-label">
          {statement.label}
        </Badge>
        <span className="kicker">{statement.kicker}</span>
        <h2>{statement.headlineLines[0]}<br />{statement.headlineLines[1]}</h2>
        <p>{statement.copy}</p>
      </MotionSection>
    </section>
  );
}
