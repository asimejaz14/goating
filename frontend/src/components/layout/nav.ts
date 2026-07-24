import {
  GitBranch,
  Heart,
  LayoutDashboard,
  Receipt,
  Syringe,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter wording for the mobile tab bar, where space is tight. */
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden from the phone tab bar — reachable from the sidebar and links. */
  desktopOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/goats", label: "Herd", icon: Users },
  { href: "/crossings", label: "Crossings", shortLabel: "Breeding", icon: Heart },
  { href: "/pedigree", label: "Pedigree", shortLabel: "Tree", icon: GitBranch },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/vaccinations", label: "Vaccinations", icon: Syringe, desktopOnly: true },
];

/** The tab bar holds five items comfortably at 360px; more starts to crowd. */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.desktopOnly);

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
