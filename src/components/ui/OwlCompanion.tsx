"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Shield, CheckCircle2, Lock, AlertTriangle, Sparkles } from "lucide-react";

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

export interface OwlCompanionProps {
  state?: OwlState;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  trackMouse?: boolean;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
  showBadge?: boolean;
  onClick?: () => void;
}

const DEFAULT_MESSAGES: Record<OwlState, string> = {
  idle: "Your vault is protected.",
  connecting: "Connecting your wallet...",
  verifying: "Awaiting cryptographic signature...",
  file_selected: "File ready for zero-knowledge encryption.",
  encrypting: "Encrypting locally with AES-256-GCM...",
  uploading: "Uploading encrypted blocks to IPFS...",
  paused: "Upload paused. Your chunks are safe.",
  success: "Safely secured and verified!",
  decrypting: "Reconstructing file securely...",
  error: "Protected! Your raw file never leaves this device.",
};

export function OwlCompanion({
  state = "idle",
  size = "md",
  trackMouse = true,
  showSpeechBubble = false,
  speechText,
  className,
  showBadge = false,
  onClick,
}: OwlCompanionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState({ rotate: 0, x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isChirping, setIsChirping] = useState(false);

  // Natural blinking effect
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    let nextBlinkTimeout: NodeJS.Timeout;

    const scheduleNextBlink = () => {
      const delay = Math.random() * 3000 + 2500; // blink every 2.5 - 5.5s
      nextBlinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        blinkTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(nextBlinkTimeout);
    };
  }, []);

  // Mouse tracking calculation
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!trackMouse || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance === 0) return;

      // Max eye travel range in SVG units
      const maxEyeTravel = 6.5;
      const travel = Math.min(maxEyeTravel, distance / 25);
      const angle = Math.atan2(deltaY, deltaX);

      const targetX = Math.cos(angle) * travel;
      const targetY = Math.sin(angle) * travel;

      // Head tilt
      const maxRotate = 7; // degrees
      const maxTilt = 4; // px
      const rotate = Math.max(-maxRotate, Math.min(maxRotate, (deltaX / 300) * maxRotate));
      const tiltX = Math.max(-maxTilt, Math.min(maxTilt, (deltaX / 400) * maxTilt));
      const tiltY = Math.max(-maxTilt, Math.min(maxTilt, (deltaY / 400) * maxTilt));

      setPupilPos({ x: targetX, y: targetY });
      setHeadTilt({ rotate, x: tiltX, y: tiltY });
    },
    [trackMouse]
  );

  useEffect(() => {
    if (!trackMouse) return;

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [trackMouse, handleMouseMove]);

  // Size mapping for the outer container
  const sizeMap = {
    xs: "h-9 w-9",
    sm: "h-14 w-14",
    md: "h-22 w-22",
    lg: "h-32 w-32",
    xl: "h-44 w-44",
    hero: "h-64 w-64 sm:h-80 sm:w-80 md:h-[350px] md:w-[350px]",
  };

  // State-based adjustments
  const isSuccess = state === "success";
  const isEncrypting = state === "encrypting";
  const isVerifying = state === "verifying";
  const isConnecting = state === "connecting";
  const isFileSelected = state === "file_selected";
  const isUploading = state === "uploading";
  const isError = state === "error";
  const isPaused = state === "paused";
  const isDecrypting = state === "decrypting";

  // Override pupil direction for specific states if not actively tracking or user wants state feel
  let effectivePupilX = pupilPos.x;
  let effectivePupilY = pupilPos.y;

  if (isFileSelected) {
    // Look down towards file upload zone
    effectivePupilX = pupilPos.x * 0.4;
    effectivePupilY = 4.5;
  } else if (isUploading) {
    // Look slightly upward as chunks fly
    effectivePupilX = pupilPos.x * 0.4;
    effectivePupilY = -3.5;
  } else if (isError) {
    effectivePupilY = 2;
  }

  const displayMessage = speechText || DEFAULT_MESSAGES[state];

  // Glow color scheme per state
  const haloColor = isSuccess
    ? "bg-emerald-300/40 shadow-emerald-500/20"
    : isEncrypting || isDecrypting
    ? "bg-cyan-300/40 shadow-cyan-500/20 animate-pulse"
    : isVerifying
    ? "bg-purple-300/40 shadow-purple-500/20 animate-pulse"
    : isConnecting
    ? "bg-blue-300/40 shadow-blue-500/20"
    : isError
    ? "bg-rose-300/40 shadow-rose-500/20"
    : isPaused
    ? "bg-amber-300/40 shadow-amber-500/20"
    : "bg-blue-200/30 shadow-blue-500/10";

  const handleInteraction = () => {
    setIsChirping(true);
    setTimeout(() => setIsChirping(false), 600);
    onClick?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn("inline-flex flex-col items-center select-none relative group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleInteraction}
    >
      {/* Speech / Status Bubble */}
      {showSpeechBubble && (
        <div className="mb-2.5 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none z-20">
          <div className="relative rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-lg border border-slate-200/90 text-center flex items-center gap-1.5">
            {isSuccess && <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            {isEncrypting && <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0 animate-pulse" />}
            {isVerifying && <Shield className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
            <span>{displayMessage}</span>
            {/* Triangle pointer */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-slate-200 rotate-45" />
          </div>
        </div>
      )}

      {/* Main Mascot Box */}
      <div className={cn("relative shrink-0 flex items-center justify-center cursor-pointer", sizeMap[size])}>
        {/* Ambient Halo Glow */}
        <div
          className={cn(
            "absolute inset-2 rounded-full blur-2xl transition-all duration-700 pointer-events-none",
            haloColor
          )}
        />

        {/* Interactive Living Vector SVG Mascot */}
        <div
          className={cn(
            "w-full h-full relative transition-transform duration-300 ease-out",
            isChirping && "scale-110 -translate-y-1",
            isHovered && !isChirping && "scale-[1.03]"
          )}
          style={{
            transform: `translate(${headTilt.x}px, ${headTilt.y}px) rotate(${headTilt.rotate}deg)`,
            transformOrigin: "center 85%",
          }}
        >
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-xl overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="bodyGrad" x1="100" y1="20" x2="100" y2="190" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="60%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>

              <linearGradient id="chestGrad" x1="100" y1="95" x2="100" y2="185" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>

              <linearGradient id="cyberBlue" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>

              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              <linearGradient id="beakGrad" x1="100" y1="102" x2="100" y2="124" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              <linearGradient id="irisGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isSuccess ? "#34D399" : isVerifying ? "#A855F7" : isError ? "#F43F5E" : "#38BDF8"} />
                <stop offset="100%" stopColor={isSuccess ? "#059669" : isVerifying ? "#7C3AED" : isError ? "#BE123C" : "#1D4ED8"} />
              </linearGradient>

              <filter id="cyberGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Subtle Bobbing Body Animation Wrapper */}
            <g className={cn("transition-transform duration-700", !isHovered && "animate-[owl-breathe_4s_ease-in-out_infinite]")}>
              {/* Ear Tufts (Horn Feathers) */}
              {/* Left Tuft */}
              <path
                d="M 58 64 C 42 30 46 16 38 12 C 45 28 58 45 68 55 Z"
                fill="url(#bodyGrad)"
                stroke="#38BDF8"
                strokeWidth="1.5"
                className="transition-transform duration-300"
                style={{
                  transform: isHovered || isChirping ? "rotate(-4deg)" : "none",
                  transformOrigin: "58px 64px",
                }}
              />
              <path d="M 46 25 C 52 35 58 46 62 52" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

              {/* Right Tuft */}
              <path
                d="M 142 64 C 158 30 154 16 162 12 C 155 28 142 45 132 55 Z"
                fill="url(#bodyGrad)"
                stroke="#38BDF8"
                strokeWidth="1.5"
                className="transition-transform duration-300"
                style={{
                  transform: isHovered || isChirping ? "rotate(4deg)" : "none",
                  transformOrigin: "142px 64px",
                }}
              />
              <path d="M 154 25 C 148 35 142 46 138 52" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

              {/* Main Body */}
              <path
                d="M 100 36 C 54 36 40 76 40 126 C 40 166 64 186 100 186 C 136 186 160 166 160 126 C 160 76 146 36 100 36 Z"
                fill="url(#bodyGrad)"
                stroke={isSuccess ? "#10B981" : isEncrypting ? "#00F0FF" : "#1E3A8A"}
                strokeWidth="2"
              />

              {/* Folded Wings */}
              {/* Left Wing */}
              <path
                d="M 42 90 C 35 110 36 145 54 162 C 46 148 45 118 52 95 Z"
                fill="#1E293B"
                stroke="#38BDF8"
                strokeWidth="1.5"
                opacity="0.9"
              />
              {/* Right Wing */}
              <path
                d="M 158 90 C 165 110 164 145 146 162 C 154 148 155 118 148 95 Z"
                fill="#1E293B"
                stroke="#38BDF8"
                strokeWidth="1.5"
                opacity="0.9"
              />

              {/* Chest Plate / Belly */}
              <path
                d="M 72 108 C 68 145 80 178 100 178 C 120 178 132 145 128 108 C 114 116 86 116 72 108 Z"
                fill="url(#chestGrad)"
                stroke="#475569"
                strokeWidth="1"
              />

              {/* Cyber Circuit Accents on Chest */}
              <path
                d="M 100 122 L 100 148 M 92 134 L 100 142 L 108 134 M 88 156 L 100 168 L 112 156"
                stroke={isSuccess ? "#34D399" : isEncrypting ? "#38BDF8" : "#64748B"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />

              {/* Chest Shield Emblem */}
              <g transform="translate(100, 142) scale(0.7) translate(-16, -16)">
                <path
                  d="M16 2L4 7v7c0 7.5 5.1 14.5 12 16 6.9-1.5 12-8.5 12-16V7l-12-5z"
                  fill={isSuccess ? "#059669" : isVerifying ? "#7C3AED" : isEncrypting ? "#2563EB" : "#1E293B"}
                  stroke={isSuccess ? "#34D399" : isVerifying ? "#C084FC" : isEncrypting ? "#60A5FA" : "#64748B"}
                  strokeWidth="2"
                  filter={isSuccess || isEncrypting ? "url(#cyberGlow)" : undefined}
                />
                {isSuccess ? (
                  <path d="M11 16l3.5 3.5L21 11" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : isEncrypting ? (
                  <path d="M12 14v4m8-4v4M16 11a3 3 0 00-3 3v2h6v-2a3 3 0 00-3-3z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M16 8v8m-4-4h8" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                )}
              </g>

              {/* Face Mask / Eyeglass Surround */}
              <path
                d="M 60 88 C 60 72 74 62 90 64 C 95 65 98 68 100 70 C 102 68 105 65 110 64 C 126 62 140 72 140 88 C 140 102 126 112 110 110 C 104 109 101 106 100 106 C 99 106 96 109 90 110 C 74 112 60 102 60 88 Z"
                fill="#0F172A"
                stroke={isSuccess ? "#10B981" : isEncrypting ? "#00F0FF" : "#38BDF8"}
                strokeWidth="2"
              />

              {/* ── LEFT EYE ── */}
              <g transform="translate(76, 88)">
                {/* Eye Socket Outer Glow Ring */}
                <circle
                  r="19"
                  fill="#020617"
                  stroke={isSuccess ? "#34D399" : isVerifying ? "#C084FC" : isEncrypting ? "#38BDF8" : "#1E3A8A"}
                  strokeWidth="2"
                />

                {/* Sclera (White of Eye) */}
                <circle r="16" fill="#F8FAFC" />

                {/* Joyful Happy Eyes when Success */}
                {isSuccess ? (
                  <path
                    d="M -11 2 C -8 -8 8 -8 11 2"
                    stroke="#059669"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : isBlinking ? (
                  /* Blink Eyelid line */
                  <line x1="-14" y1="0" x2="14" y2="0" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                ) : (
                  /* Dynamic Eyeball & Pupil tracking cursor */
                  <g
                    style={{
                      transform: `translate(${effectivePupilX}px, ${effectivePupilY}px)`,
                      transition: "transform 120ms cubic-bezier(0.2, 0.8, 0.4, 1)",
                    }}
                  >
                    {/* Iris */}
                    <circle r="10.5" fill="url(#irisGrad)" />
                    {/* Cyber Tech Ring inside Iris */}
                    <circle r="7.5" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2" />
                    {/* Pupil */}
                    <circle r="5.5" fill="#090D16" />
                    {/* Highlights (Catchlights) */}
                    <circle cx="-3" cy="-3.5" r="2.2" fill="#FFFFFF" opacity="0.95" />
                    <circle cx="2.5" cy="2" r="1.1" fill="#FFFFFF" opacity="0.75" />
                  </g>
                )}

                {/* Eyelids / Brow Expression */}
                {isVerifying && (
                  <path d="M -16 -8 Q 0 -2 16 -12" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                )}
                {isError && (
                  <path d="M -16 -12 Q 0 -4 16 -8" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                )}
                {isPaused && (
                  <path d="M -16 -2 Q 0 4 16 -2" fill="#0F172A" opacity="0.5" />
                )}
              </g>

              {/* ── RIGHT EYE ── */}
              <g transform="translate(124, 88)">
                {/* Eye Socket Outer Glow Ring */}
                <circle
                  r="19"
                  fill="#020617"
                  stroke={isSuccess ? "#34D399" : isVerifying ? "#C084FC" : isEncrypting ? "#38BDF8" : "#1E3A8A"}
                  strokeWidth="2"
                />

                {/* Sclera (White of Eye) */}
                <circle r="16" fill="#F8FAFC" />

                {/* Joyful Happy Eyes when Success */}
                {isSuccess ? (
                  <path
                    d="M -11 2 C -8 -8 8 -8 11 2"
                    stroke="#059669"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : isBlinking ? (
                  /* Blink Eyelid line */
                  <line x1="-14" y1="0" x2="14" y2="0" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                ) : (
                  /* Dynamic Eyeball & Pupil tracking cursor */
                  <g
                    style={{
                      transform: `translate(${effectivePupilX}px, ${effectivePupilY}px)`,
                      transition: "transform 120ms cubic-bezier(0.2, 0.8, 0.4, 1)",
                    }}
                  >
                    {/* Iris */}
                    <circle r="10.5" fill="url(#irisGrad)" />
                    {/* Cyber Tech Ring inside Iris */}
                    <circle r="7.5" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2" />
                    {/* Pupil */}
                    <circle r="5.5" fill="#090D16" />
                    {/* Highlights (Catchlights) */}
                    <circle cx="-3" cy="-3.5" r="2.2" fill="#FFFFFF" opacity="0.95" />
                    <circle cx="2.5" cy="2" r="1.1" fill="#FFFFFF" opacity="0.75" />
                  </g>
                )}

                {/* Eyelids / Brow Expression */}
                {isVerifying && (
                  <path d="M -16 -12 Q 0 -2 16 -8" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                )}
                {isError && (
                  <path d="M -16 -8 Q 0 -4 16 -12" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                )}
                {isPaused && (
                  <path d="M -16 -2 Q 0 4 16 -2" fill="#0F172A" opacity="0.5" />
                )}
              </g>

              {/* Cyber Brow Ridge */}
              <path
                d="M 64 68 C 80 72 94 77 100 77 C 106 77 120 72 136 68"
                stroke={isSuccess ? "#34D399" : isEncrypting ? "#38BDF8" : "#60A5FA"}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* Beak */}
              <path
                d="M 94 96 L 106 96 L 100 114 Z"
                fill="url(#beakGrad)"
                stroke="#B45309"
                strokeWidth="1"
              />
              <path d="M 97 98 L 103 98 L 100 107 Z" fill="#FDE68A" opacity="0.7" />

              {/* Feet / Talons */}
              <g transform="translate(100, 185)">
                {/* Left foot */}
                <path d="M -24 -2 L -20 6 M -16 -2 L -14 7 M -8 -2 L -8 6" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
                {/* Right foot */}
                <path d="M 8 -2 L 8 6 M 14 -2 L 14 7 M 20 -2 L 20 6" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>

        {/* Optional State Badge Overlay */}
        {showBadge && (
          <div className="absolute -bottom-1 -right-1 z-10 animate-in zoom-in-75 duration-200">
            {isSuccess && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
            {isEncrypting && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-md ring-2 ring-white animate-pulse">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {isVerifying && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-md ring-2 ring-white">
                <Shield className="h-3 w-3" />
              </span>
            )}
            {isPaused && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md ring-2 ring-white">
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export alias to support <SecureVaultOwl />
export const SecureVaultOwl = OwlCompanion;
