import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/providers/Web3Provider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecureVault | Private files. Encrypted before they leave your device.",
  description:
    "SecureVault encrypts your files on your device before storing encrypted data through decentralized IPFS infrastructure.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-[#2563EB] selection:text-white">
        <Web3Provider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
