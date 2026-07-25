"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Placeholder for goats without a photo.
 *
 * Line art in a single inherited colour: it reads as "no picture" without
 * competing with the real photographs beside it, and it costs the palette
 * nothing because it draws entirely in `currentColor`.
 */
export function GoatPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="No photo yet"
      fill="none"
      className={cn("h-full w-full text-faint-foreground", className)}
    >
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Horns */}
        <path d="M39 33c-5-5-5-11-2-15 2 5 4 8 7 11M57 33c5-5 5-11 2-15-2 5-4 8-7 11" />
        {/* Head and muzzle */}
        <path d="M48 32c11 0 17 7 17 17 0 12-7 22-17 22s-17-10-17-22c0-10 6-17 17-17Z" />
        <path d="M41 62c2 2 4 3 7 3s5-1 7-3" />
        {/* Ears */}
        <path d="M31 44c-5-3-10-3-13-1 2 4 7 7 12 7M65 44c5-3 10-3 13-1-2 4-7 7-12 7" />
      </g>
      {/* Eyes stay solid so the face still reads at 40px */}
      <circle cx="41" cy="47" r="2.6" fill="currentColor" />
      <circle cx="55" cy="47" r="2.6" fill="currentColor" />
    </svg>
  );
}

interface GoatPhotoProps {
  src: string | null | undefined;
  alt: string;
  /** Rendered pixel size; also what Next uses to pick the image width. */
  size?: number;
  rounded?: string;
  className?: string;
  priority?: boolean;
}

export function GoatPhoto({
  src,
  alt,
  size = 80,
  rounded = "rounded-md",
  className,
  priority,
}: GoatPhotoProps) {
  // A photo hosted somewhere next.config does not allow would otherwise blow up
  // the whole card; falling back to the placeholder keeps the page usable.
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-border bg-muted",
        rounded,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showPlaceholder ? (
        <GoatPlaceholder />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${size}px`}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </div>
  );
}
