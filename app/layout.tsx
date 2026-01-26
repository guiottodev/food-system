import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  fallback: ["system-ui", "sans-serif"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Sistema Interno",
  description: "Sistema interno local para pedidos, impressao e estoque.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
