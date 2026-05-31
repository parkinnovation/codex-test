import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neural Weather",
  description: "Painel futurista de clima com dados em tempo real",
  themeColor: "#070b12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body style={{ colorScheme: "dark" }}>{children}</body>
    </html>
  );
}
