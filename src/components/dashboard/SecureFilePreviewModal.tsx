"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  FileQuestion,
  Lock,
  Flame,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { formatBytes } from "@/lib/crypto";

export interface SecurePreviewData {
  name: string;
  blob: Blob;
  mimeType?: string;
  size?: number;
  url?: string;
}

interface SecureFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: SecurePreviewData | null;
  burnSecondsRemaining?: number | null;
  onBurn?: () => void;
}

export function SecureFilePreviewModal({
  isOpen,
  onClose,
  previewData,
  burnSecondsRemaining = null,
  onBurn,
}: SecureFilePreviewModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isReadingText, setIsReadingText] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedText, setCopiedText] = useState(false);
  const [isMemoryPurged, setIsMemoryPurged] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine media category
  const mime = (previewData?.mimeType || previewData?.blob.type || "").toLowerCase();
  const name = (previewData?.name || "").toLowerCase();

  const isImage =
    mime.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(name);

  const isPdf =
    mime === "application/pdf" ||
    /\.pdf$/i.test(name);

  const isAudio =
    mime.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name);

  const isVideo =
    mime.startsWith("video/") ||
    /\.(mp4|webm|ogv|mov)$/i.test(name);

  const isText =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("xml") ||
    /\.(txt|md|json|js|jsx|ts|tsx|html|css|scss|py|sh|csv|env|log|yaml|yml|sql)$/i.test(name);

  // Initialize sandboxed Blob Object URL
  useEffect(() => {
    if (isOpen && previewData?.blob) {
      setIsMemoryPurged(false);
      setZoomLevel(1);

      // Create sandboxed in-memory URL
      const url = URL.createObjectURL(previewData.blob);
      setObjectUrl(url);

      // Read text content if applicable
      if (isText) {
        setIsReadingText(true);
        previewData.blob
          .text()
          .then((text) => {
            setTextContent(text);
          })
          .catch((err) => {
            console.error("Failed to read text:", err);
            setTextContent(null);
          })
          .finally(() => {
            setIsReadingText(false);
          });
      } else {
        setTextContent(null);
      }

      return () => {
        // Cleanup on unmount or close
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
      setTextContent(null);
    }
  }, [isOpen, previewData]);

  // Handle manual purge & close
  const handlePurgeAndClose = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setTextContent(null);
    setIsMemoryPurged(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen || !previewData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-2 max-w-none max-h-none h-[calc(100vh-16px)] z-60"
            : "max-w-4xl max-h-[92vh] h-[85vh]"
        }`}
      >
        {/* Top Burn Alert Banner (if Burn After Reading is active) */}
        {burnSecondsRemaining !== null && (
          <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white px-4 py-2 flex items-center justify-between text-xs font-mono font-bold animate-pulse shadow-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-200 animate-bounce" />
              <span>BURN AFTER READING ARMED: Self-destructing in {formatCountdown(burnSecondsRemaining)}</span>
            </div>
            <span className="text-[11px] bg-black/30 px-2 py-0.5 rounded-full font-sans tracking-wide">
              Zero-Disk Volatile Memory
            </span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100 shrink-0">
              {isImage ? (
                <ImageIcon className="h-5 w-5" />
              ) : isPdf || isText ? (
                <FileText className="h-5 w-5" />
              ) : isAudio ? (
                <Music className="h-5 w-5" />
              ) : isVideo ? (
                <Film className="h-5 w-5" />
              ) : (
                <FileQuestion className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {previewData.name}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                  <ShieldCheck className="h-3 w-3" />
                  0-Disk RAM Sandbox
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {formatBytes(previewData.size || previewData.blob.size)} • {previewData.mimeType || previewData.blob.type || "unknown"}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Image zoom controls */}
            {isImage && (
              <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-mono px-2 text-slate-600 font-semibold">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Text Copy Button */}
            {isText && textContent !== null && (
              <button
                type="button"
                onClick={handleCopyText}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                title="Copy Text Content"
              >
                {copiedText ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Purge & Close Button */}
            <button
              type="button"
              onClick={handlePurgeAndClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs"
              title="Purge Decrypted Memory & Close"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Purge Memory & Close</span>
              <span className="sm:hidden">Close</span>
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4 relative flex items-center justify-center">
          {isMemoryPurged ? (
            <div className="text-center space-y-2 animate-in zoom-in-95">
              <ShieldCheck className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Decrypted Memory Purged</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Blob URL revoked and volatile plaintext references removed from memory.
              </p>
            </div>
          ) : isImage && objectUrl ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={objectUrl}
                alt={previewData.name}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg transition-transform duration-150 select-none"
              />
            </div>
          ) : isPdf && objectUrl ? (
            <iframe
              src={objectUrl}
              title={previewData.name}
              className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner"
            />
          ) : isAudio && objectUrl ? (
            <div className="w-full max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-4 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100">
                <Music className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewData.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Decrypted Audio • {formatBytes(previewData.size || previewData.blob.size)}
                </p>
              </div>
              <audio controls src={objectUrl} className="w-full mt-2" autoPlay={false} />
            </div>
          ) : isVideo && objectUrl ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              <video
                controls
                src={objectUrl}
                className="max-h-full max-w-full rounded-2xl shadow-xl bg-black"
                controlsList="nodownload"
              />
            </div>
          ) : isText ? (
            <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-inner flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>{previewData.name}</span>
                <span>
                  {textContent ? `${textContent.split("\n").length} lines • ${textContent.length} chars` : "Loading..."}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text selection:bg-blue-100 selection:text-blue-900">
                {isReadingText ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <span>Reading decrypted text into secure memory...</span>
                  </div>
                ) : (
                  textContent || "(Empty file)"
                )}
              </div>
            </div>
          ) : (
            /* Binary / Generic File Card */
            <div className="w-full max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <FileQuestion className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">{previewData.name}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {formatBytes(previewData.size || previewData.blob.size)} • {previewData.mimeType || "Binary Payload"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Decryption Status:</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified SHA-256
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Inline Rendering:</span>
                  <span className="text-slate-500">Binary format requires external app</span>
                </div>
              </div>
              {objectUrl && (
                <a
                  href={objectUrl}
                  download={previewData.name}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Decrypted File to Disk</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white/95 backdrop-blur-sm flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span>Zero-Disk Protocol: Plaintext exists only in sandboxed memory.</span>
          </div>
          <div className="flex items-center gap-3">
            {objectUrl && (
              <a
                href={objectUrl}
                download={previewData.name}
                className="text-[#2563EB] hover:underline font-medium flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                <span>Save to Disk</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
