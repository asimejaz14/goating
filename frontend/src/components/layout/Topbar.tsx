"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { usePageActionSlot } from "./PageActionContext";
import { isActivePath, NAV_ITEMS } from "./nav";

function currentSection(pathname: string): string {
  const match = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
  return match?.label ?? "Goat Farm";
}

/**
 * Sticky and slim — a breadcrumb for orientation and, crucially, the current
 * page's primary action pinned on the right. It stays visible while a long
 * list scrolls, so "Add goat" or "Record crossing" is never more than a
 * glance away.
 */
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const action = usePageActionSlot();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {/* The page's own title repeats this section name right below, so on
              a narrow phone the "Goat Farm /" prefix is the first, safest thing
              to drop — it buys the room the current section needs to avoid
              truncating instead. */}
          <li className="hidden text-faint-foreground sm:block">Goat Farm</li>
          <li className="hidden text-faint-foreground sm:block" aria-hidden>
            /
          </li>
          <li className="truncate font-medium text-foreground">{currentSection(pathname)}</li>
        </ol>
      </nav>

      {/* The theme toggle lives in the sidebar only — always visible there on
          desktop, and reachable from the mobile drawer — so it never needs a
          second copy competing for space here. */}
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
