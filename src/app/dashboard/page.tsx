import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentFiles } from "@/components/dashboard/RecentFiles";
import { Upload, FolderLock, ShieldAlert, Activity } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vault Dashboard | SecureVault",
  description: "Manage your client-encrypted files, IPFS decentralized pins, and sovereign security status.",
};

export default function DashboardPage() {
  const quickActions = [
    {
      title: "Upload a File",
      description: "Encrypt and store on IPFS",
      icon: Upload,
      href: "/dashboard/encrypt",
      color: "text-[#2563EB]",
      bg: "bg-blue-50",
    },
    {
      title: "View Files",
      description: "Manage your encrypted files",
      icon: FolderLock,
      href: "/dashboard/vault",
      color: "text-[#2563EB]",
      bg: "bg-blue-50",
    },
    {
      title: "Security Center",
      description: "Learn how it works",
      icon: ShieldAlert,
      href: "/#security",
      color: "text-[#2563EB]",
      bg: "bg-blue-50",
    },
    {
      title: "Activity",
      description: "View recent activity",
      icon: Activity,
      href: "#activity",
      color: "text-[#2563EB]",
      bg: "bg-blue-50",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Screen 4: Welcome Banner */}
        <DashboardHeader />

        {/* 4 Stat Cards */}
        <DashboardStats />

        {/* Quick Actions (Screen 4) */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 group flex items-center gap-3.5"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.bg} ${action.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#2563EB] transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* File Directory (Screen 10) */}
        <RecentFiles />
      </div>
    </ProtectedRoute>
  );
}
