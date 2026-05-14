import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Previsão do Tempo",
  description: "Previsão do tempo para hoje com dados em tempo real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
