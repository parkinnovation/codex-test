import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retro Weather",
  description: "Painel retrô de clima com dados em tempo real",
  themeColor: "#c29a63",
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
