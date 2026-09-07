import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Risk Sim — Mahkamah Agung RI",
  description: "Sistem Informasi Manajemen Risiko Mahkamah Agung Republik Indonesia",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
