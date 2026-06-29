import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Schibsted Grotesk', sans-serif" },
        body: { value: "'Hanken Grotesk', sans-serif" },
      },
    },
    keyframes: {
      fadeUp: {
        from: { opacity: "0", transform: "translateY(8px)" },
        to: { opacity: "1", transform: "translateY(0)" },
      },
    },
  },
  globalCss: {
    "html, body, #root": {
      minHeight: "100%",
    },
    body: {
      color: "#1A1A1E",
      background: "#FBFBFA",
    },
    "::selection": {
      background: "rgba(5,150,105,0.16)",
    },
  },
});

export const system = createSystem(defaultConfig, config);
