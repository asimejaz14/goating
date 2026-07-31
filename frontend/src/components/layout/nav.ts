import { GitBranch, Heart, LayoutDashboard, Receipt, Syringe } from "lucide-react";

import { GoatIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavSection {
  /** Shown above the group. Kept to one plain word wherever possible. */
  label: string;
  items: NavItem[];
}

/**
 * Grouped rather than one flat run, so the sidebar answers "what can I do
 * here?" at a glance: the state of the herd, the breeding side of it, and the
 * running records. Six links do not strictly need dividing — but the headings
 * are what make it obvious that Crossings and Pedigree are two views of the
 * same subject, and that Expenses is not.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Herd",
    items: [
      { href: "/goats", label: "Goats", icon: GoatIcon },
      { href: "/crossings", label: "Crossings", icon: Heart },
      { href: "/pedigree", label: "Pedigree", icon: GitBranch },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/vaccinations", label: "Vaccinations", icon: Syringe },
      { href: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
];

/** Flat list, for anything that just needs "which page am I on?". */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
