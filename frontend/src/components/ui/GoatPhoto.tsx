"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Flat illustrated placeholder for goats without a photo.
 *
 * Drawn inline rather than shipped as a file so it scales crisply at every size
 * and picks up the farm palette directly.
 */
export function GoatPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="No photo yet"
      className={cn("h-full w-full", className)}
    >
      <rect width="96" height="96" rx="18" className="fill-pasture-50" />
      {/* Ears */}
      <ellipse cx="26" cy="47" rx="10" ry="6.5" className="fill-barn-300" />
      <ellipse cx="70" cy="47" rx="10" ry="6.5" className="fill-barn-300" />
      {/* Horns */}
      <path
        d="M38 32c-4-6-3-12 1-15 1 5 3 8 6 11M58 32c4-6 3-12-1-15-1 5-3 8-6 11"
        className="stroke-barn-500"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Head */}
      <path
        d="M48 30c12 0 19 7 19 18 0 13-8 24-19 24S29 61 29 48c0-11 7-18 19-18Z"
        className="fill-barn-200"
      />
      {/* Muzzle */}
      <ellipse cx="48" cy="62" rx="10" ry="8" className="fill-cream-100" />
      <circle cx="45" cy="60" r="1.6" className="fill-barn-600" />
      <circle cx="51" cy="60" r="1.6" className="fill-barn-600" />
      {/* Eyes */}
      <ellipse cx="40" cy="46" rx="3.4" ry="3" className="fill-ink" />
      <ellipse cx="56" cy="46" rx="3.4" ry="3" className="fill-ink" />
      <circle cx="41.2" cy="45" r="1.1" className="fill-cream-50" />
      <circle cx="57.2" cy="45" r="1.1" className="fill-cream-50" />
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
  rounded = "rounded-2xl",
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
        "relative shrink-0 overflow-hidden bg-pasture-50",
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
