import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SellGenius AI — Independent Commerce, CRM & AI Growth Ecosystem",
  description:
    "Launch your online store, manage customers and sales pipelines natively, and grow faster with an analytics-grounded AI Business Growth Advisor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-navy-900 antialiased">{children}</body>
    </html>
  );
}
