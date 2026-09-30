import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/providers/Web3Provider";
import { NextAuthProvider } from "@/providers/NextAuthProvider";
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
  title: "CYBER-10 | Decentralized Secure File Storage",
  description:
    "Zero-knowledge decentralized file storage and sharing platform where users maintain complete control of their data.",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#141618] text-[#f2f4f6] selection:bg-[#f6851b] selection:text-[#141618]">
        <NextAuthProvider>
          <Web3Provider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </Web3Provider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
