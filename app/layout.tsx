import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_SITE_NAME ?? "BD Career Platform",
    template: `%s | ${process.env.NEXT_PUBLIC_SITE_NAME ?? "BD Career Platform"}`,
  },
  description: "Bangladesh Jobs, Admission & Result information platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
