import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tickmark — audit-grade GenAI evaluation",
  description: "Evaluation, observability, and governance for finance GenAI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
