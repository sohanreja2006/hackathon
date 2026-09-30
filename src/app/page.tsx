import React from "react";
import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SecurityFeatures } from "@/components/landing/SecurityFeatures";
import { WhyCyber10 } from "@/components/landing/WhyCyber10";

export const metadata: Metadata = {
  title: "CYBER-10 | Decentralized Secure File Storage & Sharing",
  description:
    "Your Files. Encrypted. Decentralized. Yours. CYBER-10 is a zero-knowledge decentralized file storage and sharing platform engineered for sovereign data privacy.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <Hero />
      <HowItWorks />
      <SecurityFeatures />
      <WhyCyber10 />
    </div>
  );
}
