"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Shield, CheckCircle2, Lock, AlertTriangle, Info } from "lucide-react";

export type OwlState =
  | "idle"
  | "connecting"
  | "verifying"
  | "file_selected"
  | "encrypting"
  | "uploading"
  | "paused"
  | "success"
  | "decrypting"
  | "error";

interface OwlCompanionProps {
  state?: OwlState;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
  showBadge?: boolean;
}

const DEFAULT_MESSAGES: Record<OwlState, string> = {
  idle: "Your vault is secure.",
  connecting: "Connecting your wallet...",
  verifying: "Waiting for your signature verification.",
  file_selected: "I've got your file ready to secure.",
  encrypting: "Encrypting locally in your browser...",
  uploading: "Uploading encrypted chunks to IPFS...",
  paused: "Upload paused. Your chunks are safe.",
  success: "Your file is safely secured!",
  decrypting: "Reconstructing your file locally...",
  error: "Your file data is safe on this device.",
};

export function OwlCompanion({
  state = "idle",
  size = "md",
  showSpeechBubble = false,
  speechText,
  className,
  showBadge = false,
}: OwlCompanionProps) {
  // Determine image source based on state
  let imgSrc = "/images/owl-hero.png";
  if (state === "success") {
    imgSrc = "/images/owl-success.png";
  } else if (state === "decrypting") {
    imgSrc = "/images/owl-laptop.png";
  } else if (state === "verifying" || state === "connecting" || state === "error") {
    imgSrc = "/images/owl-verify.png";
  }

  // Size mapping
  const sizeMap = {
    xs: "h-9 w-9",
    sm: "h-14 w-14",
    md: "h-22 w-22",
    lg: "h-32 w-32",
    xl: "h-44 w-44",
    hero: "h-72 w-72 sm:h-88 sm:w-88 md:h-[360px] md:w-[360px]",
  };

  const pixelMap = {
    xs: 36,
    sm: 56,
    md: 88,
    lg: 128,
    xl: 176,
    hero: 360,
  };

  // State-specific animation styles
  const animationClass = cn(
    "transition-transform duration-500 ease-out",
    state === "idle" && "animate-[owl-breathe_4s_ease-in-out_infinite] motion-reduce:animate-none",
    state === "connecting" && "animate-[owl-breathe_3s_ease-in-out_infinite] scale-[1.02] motion-reduce:animate-none",
    state === "verifying" && "animate-[owl-float-slow_3.5s_ease-in-out_infinite] motion-reduce:animate-none",
    state === "file_selected" && "scale-[1.03] transition-transform duration-300",
    state === "encrypting" && "animate-[owl-breathe_2.5s_ease-in-out_infinite] motion-reduce:animate-none",
    state === "uploading" && "animate-[owl-float-slow_4s_ease-in-out_infinite] motion-reduce:animate-none",
    state === "paused" && "opacity-90 grayscale-[15%]",
    state === "success" && "animate-[owl-success-glow_3s_ease-in-out_infinite] motion-reduce:animate-none",
    state === "decrypting" && "scale-[1.01] animate-[owl-breathe_3s_ease-in-out_infinite] motion-reduce:animate-none",
    state === "error" && "scale-[0.98]"
  );

  const displayMessage = speechText || DEFAULT_MESSAGES[state];

  return (
    <div className={cn("inline-flex flex-col items-center select-none relative", className)}>
      {/* Speech / Status Bubble */}
      {showSpeechBubble && (
        <div className="mb-2 max-w-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="relative rounded-2xl bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 shadow-md border border-slate-200/90 text-center">
            <span>{displayMessage}</span>
            {/* Triangle pointer */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-slate-200 rotate-45" />
          </div>
        </div>
      )}

      {/* Owl Container with soft ambient halo */}
      <div className={cn("relative shrink-0 flex items-center justify-center", sizeMap[size])}>
        {/* Soft background glow based on state */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-xl transition-all duration-700 pointer-events-none",
            state === "idle" && "bg-blue-100/40 scale-90",
            state === "connecting" && "bg-blue-200/50 scale-100",
            state === "verifying" && "bg-purple-200/50 scale-100 animate-[owl-shield-pulse_3s_ease-in-out_infinite]",
            state === "file_selected" && "bg-blue-200/60 scale-105",
            state === "encrypting" && "bg-cyan-200/60 scale-105 animate-[owl-shield-pulse_2.5s_ease-in-out_infinite]",
            state === "uploading" && "bg-blue-200/50 scale-100",
            state === "paused" && "bg-amber-100/60 scale-90",
            state === "success" && "bg-emerald-200/60 scale-110",
            state === "decrypting" && "bg-cyan-200/50 scale-100",
            state === "error" && "bg-rose-100/60 scale-90"
          )}
        />

        {/* 3D Owl Image */}
        <div className={cn("relative w-full h-full", animationClass)}>
          <Image
            src={imgSrc}
            alt="SecureVault Owl Guardian"
            width={pixelMap[size]}
            height={pixelMap[size]}
            className="object-contain w-full h-full drop-shadow-md rounded-2xl"
            priority={size === "hero"}
          />
        </div>

        {/* Optional State Badge Overlay */}
        {showBadge && (
          <div className="absolute -bottom-1 -right-1 z-10">
            {state === "success" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
            {state === "encrypting" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm ring-2 ring-white animate-pulse">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {state === "verifying" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm ring-2 ring-white">
                <Shield className="h-3 w-3" />
              </span>
            )}
            {state === "paused" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-white">
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
