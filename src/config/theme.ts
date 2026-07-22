// Mirrors the CSS custom properties in src/app/globals.css (:root).
// globals.css is the source of truth for styling — these are the same values,
// exposed to TypeScript for cases where a component needs the raw value
// (e.g. an inline style) instead of a CSS variable. Keep in sync manually.
export const theme = {
  colors: {
    red: "#d71920",
    black: "#0b0b0b",
    cream: "#efe9df",
    white: "#fff",
    gray: "#777",
    line: "rgba(11,11,11,.2)",
    acid: "#f5ff35",
  },
  fonts: {
    sans: "Arial,Helvetica,sans-serif",
  },
  durations: {
    fast: ".2s",
    base: ".25s",
    slow: ".3s",
  },
  borderWidths: {
    default: "2px",
    heavy: "3px",
  },
  radii: {
    round: "50%",
    pill: "20px",
  },
  shadowOffsets: {
    sm: "5px",
    md: "7px",
    lg: "12px",
  },
  sectionPadding: {
    x: "4vw",
    ySm: "9vw",
    yMd: "10vw",
    yLg: "11vw",
  },
} as const;
