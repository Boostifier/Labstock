import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LABSTOCK — Gestion de Stock Laboratoire",
  description: "Système de gestion de stock pour laboratoire d'analyses médicales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
