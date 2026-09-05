import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./ios.css";
import "./ux.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  let metadataBase: URL;
  try { metadataBase = new URL(`${protocol}://${host}`); } catch { metadataBase = new URL("http://localhost:3000"); }
  const title = "NEXUS OS — персональная система жизни";
  const description = "Задачи, привычки, финансы, здоровье и AI-ассистент в одной ясной системе.";
  return {
    metadataBase,
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", images: [{ url: "/og-orbit.png", width: 1200, height: 630, alt: "NEXUS OS — второй мозг для жизни" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-orbit.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
