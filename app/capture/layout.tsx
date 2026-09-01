import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Входящие — NEXUS",
  description: "Быстро сохраните мысль и разберите её позже в системе PARA.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NEXUS Inbox" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#171717",
};

export default function CaptureLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
