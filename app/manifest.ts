import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXUS Входящие",
    short_name: "Входящие",
    description: "Быстрая фиксация мыслей в систему PARA.",
    start_url: "/capture",
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    lang: "ru",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
