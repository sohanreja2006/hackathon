"use client";

import React, { useState } from "react";
import { 
  Lock, 
  ShieldCheck, 
  Download, 
  Share2, 
  Search,
  Check,
  Copy,
  Info
} from "lucide-react";
import { MockSecureFile } from "@/types";
import { formatBytes } from "@/lib/utils";

/**
 * MOCK RECENT FILES DATASET
 * Realistic cybersecurity/enterprise dummy files
 * 
 * TODO: [PHASE 4 & 5 - BACKEND & IPFS PINNING]
 * Replace this mock data store with dynamic queries to Pinata/IPFS
 * and our sovereign metadata database.
 */
export const INITIAL_MOCK_FILES: MockSecureFile[] = [
  {
    id: "cf-001",
    name: "q3_financial_audit.pdf.enc",
    originalName: "q3_financial_audit.pdf",
    extension: "PDF",
    sizeBytes: 4404019, // 4.2 MB
    mimeType: "application/pdf",
    status: "encrypted_aes256",
    statusLabel: "AES-GCM-256",
    encryptionAlgorithm: "AES-GCM-256",
    cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    createdAt: "2026-09-28T14:32:00Z",
    updatedAt: "2026-09-28T14:32:00Z",
    sharedCount: 2,
    tags: ["Financial", "Confidential"],
  },
  {
    id: "cf-002",
    name: "corporate_master_seed.kdbx.enc",
    originalName: "corporate_master_seed.kdbx",
    extension: "KDBX",
    sizeBytes: 860160, // ~840 KB
    mimeType: "application/octet-stream",
    status: "encrypted_aes256",
    statusLabel: "AES-GCM-256",
    encryptionAlgorithm: "AES-GCM-256",
    cid: "bafybeicg4w3vhskd5x2j6rplg536vhsmx3yq7zox2d6p9g743vh8x3lqba",
    createdAt: "2026-09-27T09:15:00Z",
    updatedAt: "2026-09-27T09:15:00Z",
    sharedCount: 0,
    tags: ["Vault", "Critical"],
  },
  {
    id: "cf-003",
    name: "patent_application_draft_v2.docx.enc",
    originalName: "patent_application_draft_v2.docx",
    extension: "DOCX",
    sizeBytes: 1887436, // ~1.8 MB
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    status: "encrypted_aes256",
    statusLabel: "AES-GCM-256",
    encryptionAlgorithm: "AES-GCM-256",
    cid: "bafybeifk4v9xpmh236v8hjsd35g7zkx33q9v8sl4k2m9h4p3j2f6v8s7ma",
    createdAt: "2026-09-26T18:45:00Z",
    updatedAt: "2026-09-26T18:45:00Z",
    sharedCount: 3,
    tags: ["Legal", "IP"],
  },
  {
    id: "cf-004",
    name: "biometric_hash_manifest.json.enc",
    originalName: "biometric_hash_manifest.json",
    extension: "JSON",
    sizeBytes: 122880, // ~120 KB
    mimeType: "application/json",
    status: "pinned_ipfs",
    statusLabel: "IPFS Swarm Pinned",
    encryptionAlgorithm: "AES-GCM-256",
    cid: "bafybeiah7d8zk3mv57ghx4m29sd89fx5l3m82v9f2k4m8h3x4l9v7d6s2a",
    createdAt: "2026-09-25T11:20:00Z",
    updatedAt: "2026-09-25T11:20:00Z",
    sharedCount: 1,
    tags: ["Security", "Biometric"],
  },
  {
    id: "cf-005",
    name: "smart_contract_keys.pem.enc",
    originalName: "smart_contract_keys.pem",
    extension: "PEM",
    sizeBytes: 49152, // ~48 KB
    mimeType: "application/x-pem-file",
    status: "encrypted_aes256",
    statusLabel: "AES-GCM-256",
    encryptionAlgorithm: "AES-GCM-256",
    cid: "bafybeid7s3k9vh52md9sk3mx29g7zk45f8h2m9s7k3v2m8p5l4k9j8s3qa",
    createdAt: "2026-09-24T08:10:00Z",
    updatedAt: "2026-09-24T08:10:00Z",
    sharedCount: 0,
    tags: ["Deployment", "Keys"],
  },
  {
    id: "cf-006",
    name: "board_resolutions_2026.pdf.enc",
    originalName: "board_resolutions_2026.pdf",
    extension: "PDF",
    sizeBytes: 3250585, // ~3.1 MB
    mimeType: "application/pdf",
    status: "encrypted_aes256",
    statusLabel: "AES-GCM-256",
    encryptionAlgorithm: "AES-GCM-256",
    cid: "bafybeie9s3kd8mh35f8xk2m9h4s8zk3v5l7m2p9f4k8h3s6l2m9v7d4s1a",
    createdAt: "2026-09-22T16:05:00Z",
    updatedAt: "2026-09-22T16:05:00Z",
    sharedCount: 4,
    tags: ["Corporate", "Board"],
  },
];

export function RecentFiles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  const filteredFiles = INITIAL_MOCK_FILES.filter(
    (file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.extension.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleActionNotice = (fileName: string, actionType: string) => {
    setActiveNotification(
      `Notice: "${actionType}" for ${fileName} will be activated in Phase 3/4 (Client AES & IPFS). This is a mock preview for Phase 1.`
    );
    setTimeout(() => {
      setActiveNotification(null);
    }, 4500);
  };

  const handleCopyCid = (cid?: string) => {
    if (!cid) return;
    navigator.clipboard.writeText(cid);
    setCopiedCid(cid);
    setTimeout(() => setCopiedCid(null), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span>Recent Vault Files</span>
            <span className="text-xs font-mono font-normal rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-zinc-400">
              {filteredFiles.length} Total
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Sovereign encrypted payloads pinned to decentralized storage nodes
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search encrypted files..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Temporary Toast Banner for Phase 1 simulation */}
      {activeNotification && (
        <div className="bg-cyan-950/40 border-b border-cyan-500/30 px-5 py-2.5 flex items-center gap-2 text-xs font-mono text-cyan-300 animate-in fade-in duration-200">
          <Info className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>{activeNotification}</span>
        </div>
      )}

      {/* Files Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-5">File Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Security Status</th>
              <th className="py-3 px-4">Date Added</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredFiles.map((file) => (
              <tr
                key={file.id}
                className="hover:bg-zinc-800/40 transition-colors group"
              >
                {/* File Name */}
                <td className="py-3.5 px-5 font-medium text-zinc-200">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate max-w-[200px] sm:max-w-xs font-sans text-xs font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                        {file.name}
                      </span>
                      {file.cid && (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <span>CID: {file.cid.substring(0, 10)}...</span>
                          <button
                            onClick={() => handleCopyCid(file.cid)}
                            title="Copy IPFS CID"
                            type="button"
                            className="hover:text-zinc-300"
                          >
                            {copiedCid === file.cid ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="py-3.5 px-4 text-zinc-400">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                    {file.extension}
                  </span>
                </td>

                {/* Size */}
                <td className="py-3.5 px-4 text-zinc-400">
                  {formatBytes(file.sizeBytes)}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-[10px] text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {file.statusLabel}
                  </span>
                </td>

                {/* Date */}
                <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                  {new Date(file.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleActionNotice(file.name, "Download & Decrypt")}
                      type="button"
                      title="Download Encrypted Shard"
                      className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleActionNotice(file.name, "Share Access Key")}
                      type="button"
                      title="Share Access Grant"
                      className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFiles.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No encrypted files found matching your search.
          </div>
        )}
      </div>

      {/* Table Footer Note */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Zero Server Decryption Guarantee • Files reside in encrypted state</span>
        </div>
        <div>6 of 6 mock vault records loaded</div>
      </div>
    </div>
  );
}
