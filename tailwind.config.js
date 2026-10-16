const plugin = require("tailwindcss/plugin");

// Hex CSS variables keep opacity modifiers (bg-primary/40) working via color-mix;
// plain classes (bg-primary) stay a bare var() for older browsers.
const token = (name) => ({ opacityValue }) =>
  opacityValue === undefined || String(opacityValue).startsWith("var(")
    ? `var(${name})`
    : `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts}",
    "./lib/**/*.{js,ts}",
  ],
  corePlugins: { container: false },
  theme: {
    extend: {
      colors: {
        bg: token("--color-bg"),
        surface: token("--color-surface"),
        text: token("--color-text"),
        muted: token("--color-muted"),
        primary: token("--color-primary"),
        accent: token("--color-accent"),
        hairline: token("--color-hairline"),
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
        accent: ["var(--font-accent, var(--font-heading))"],
      },
      maxWidth: { site: "var(--max-width)" },
    },
  },
  plugins: [
    plugin(({ addBase, addComponents }) => {
      addBase({
        ":root": {
          "--color-bg": "#ffffff",
          "--color-surface": "#f5f5f4",
          "--color-text": "#1c1917",
          "--color-muted": "#78716c",
          "--color-primary": "#1c1917",
          "--color-accent": "#b45309",
          "--color-hairline": "rgba(120, 113, 108, 0.25)",
          "--font-heading": "Georgia, serif",
          "--font-body": "system-ui, sans-serif",
          "--max-width": "1200px",
        },
        html: { overflowY: "overlay", WebkitTextSizeAdjust: "100%" },
        body: {
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-body)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "h1, h2, h3, h4, h5, h6": { fontFamily: "var(--font-heading)" },
        "::-webkit-scrollbar": { width: "6px", height: "6px" },
        "::-webkit-scrollbar-track": { background: "transparent" },
        "::-webkit-scrollbar-thumb": {
          background: "rgba(155, 155, 155, 0.4)",
          borderRadius: "9999px",
        },
        "::-webkit-scrollbar-thumb:hover": { background: "rgba(155, 155, 155, 0.7)" },
        ":focus-visible": {
          outline: "2px solid var(--color-primary)",
          outlineOffset: "3px",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      });
      addComponents({
        ".container": {
          width: "100%",
          maxWidth: "var(--max-width)",
          marginInline: "auto",
          paddingInline: "1.25rem",
          "@media (min-width: 768px)": { paddingInline: "2rem" },
        },
        ".section": { paddingBlock: "clamp(4rem, 9vw, 7.5rem)" },
        ".btn": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          minHeight: "44px",
          padding: "0.75rem 1.75rem",
          fontFamily: "var(--font-body)",
          fontSize: "0.875rem",
          fontWeight: "500",
          letterSpacing: "0.04em",
          border: "1px solid transparent",
          borderRadius: "var(--radius, 2px)",
          cursor: "pointer",
          transition: "background-color 200ms, color 200ms, border-color 200ms, transform 120ms",
          "&:active": { transform: "scale(0.98)" },
          "&:disabled": { opacity: "0.5", cursor: "not-allowed" },
        },
        ".btn-primary": {
          backgroundColor: "var(--color-primary)",
          color: "var(--color-bg)",
          "&:hover": {
            backgroundColor: "color-mix(in srgb, var(--color-primary) 88%, var(--color-text))",
          },
        },
        ".btn-secondary": {
          backgroundColor: "transparent",
          color: "var(--color-text)",
          borderColor: "currentColor",
          "&:hover": {
            backgroundColor: "color-mix(in srgb, var(--color-text) 8%, transparent)",
          },
        },
        ".eyebrow": {
          display: "inline-block",
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          fontWeight: "500",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--color-primary)",
        },
        ".visually-hidden": {
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
        },
      });
    }),
  ],
};
