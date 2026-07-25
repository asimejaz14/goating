/**
 * Icons lucide does not ship.
 *
 * These follow lucide's drawing conventions exactly — 24×24 box, `currentColor`
 * strokes at width 2 with round caps and joins — so they sit beside the real
 * lucide icons in the nav without looking bolted on.
 */

interface IconProps {
  className?: string;
}

/** Goat head, for the herd. lucide has no goat, and `Users` read as people. */
export function GoatIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Horns */}
      <path d="M9 5C7.5 3.5 6 3 4.5 3.5c.4 1.6 1.4 3 2.8 3.9" />
      <path d="M15 5c1.5-1.5 3-2 4.5-1.5-.4 1.6-1.4 3-2.8 3.9" />
      {/* Head, tapering to the muzzle */}
      <path d="M12 5.5c3.1 0 5 2.4 5 6 0 4-1.6 8-3.2 9.6a2.4 2.4 0 0 1-3.6 0C8.6 19.5 7 15.5 7 11.5c0-3.6 1.9-6 5-6Z" />
      {/* Ears, hanging long and low */}
      <path d="M7.4 9.5C5.6 10.4 4 12.9 4 15.6c0 2 .9 3.1 2.1 2.6 1.3-.6 2.4-3.3 2.5-6" />
      <path d="M16.6 9.5c1.8.9 3.4 3.4 3.4 6.1 0 2-.9 3.1-2.1 2.6-1.3-.6-2.4-3.3-2.5-6" />
      {/* Muzzle */}
      <path d="M12 17.5v1.5" />
    </svg>
  );
}
