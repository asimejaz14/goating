import { GitBranch, Heart, LayoutDashboard, Receipt, Syringe } from "lucide-react";

import { GoatIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/goats", label: "Herd", icon: GoatIcon },
  { href: "/crossings", label: "Crossings", icon: Heart },
  { href: "/pedigree", label: "Pedigree", icon: GitBranch },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/vaccinations", label: "Vaccinations", icon: Syringe },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
