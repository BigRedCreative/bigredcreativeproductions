import type { ReactNode } from "react";

type SectionHeadingProps = {
  kicker: string;
  heading: ReactNode;
  description?: ReactNode;
  wrapperClassName?: string;
};

export default function SectionHeading({
  kicker,
  heading,
  description,
  wrapperClassName,
}: SectionHeadingProps) {
  return (
    <div className={wrapperClassName}>
      <span className="kicker">{kicker}</span>
      <h2>{heading}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
