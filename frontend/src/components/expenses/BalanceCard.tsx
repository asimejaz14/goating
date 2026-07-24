"use client";

import { ArrowRight, CheckCircle2, Handshake, Scale } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { SoftCard } from "@/components/ui/SoftCard";
import { cn } from "@/lib/cn";
import { formatMoney, initials } from "@/lib/format";
import type { Balance } from "@/lib/types";

import { SettleUpDialog } from "./SettleUpDialog";

/**
 * Who is ahead, who is behind, and the one button that fixes it.
 *
 * Everything on the farm is a 50/50 split, so the only number that matters is
 * the gap between what each partner has paid out — that gets the big type, and
 * the per-person detail sits underneath for when someone wants to check it.
 */
export function BalanceCard({
  balance,
  symbol = "₨",
  index = 0,
  className,
}: {
  balance: Balance;
  symbol?: string;
  index?: number;
  className?: string;
}) {
  const [settling, setSettling] = useState(false);
  const owed = Number(balance.amount_owed ?? 0);
  const total = Number(balance.total_expenses ?? 0);

  return (
    <>
      <SoftCard index={index} className={cn("flex flex-col", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-muted">Shared balance</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {formatMoney(total, symbol)} spent, split down the middle
            </p>
          </div>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              balance.settled ? "bg-pasture-100 text-pasture-700" : "bg-gold-100 text-gold-700",
            )}
          >
            {balance.settled ? (
              <CheckCircle2 className="h-[18px] w-[18px]" />
            ) : (
              <Scale className="h-[18px] w-[18px]" />
            )}
          </span>
        </div>

        {balance.settled ? (
          <p className="mt-3 text-lg font-bold leading-snug text-ink">
            All square — nothing owed either way.
          </p>
        ) : (
          <>
            <p className="tnum mt-3 text-3xl font-bold leading-none text-ink">
              {formatMoney(owed, symbol)}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
              <span className="font-semibold text-ink">{balance.debtor_name ?? "—"}</span>
              <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              <span className="font-semibold text-ink">{balance.creditor_name ?? "—"}</span>
            </p>
          </>
        )}

        <ul className="mt-4 space-y-2 border-t border-cream-200 pt-3">
          {balance.per_person.map((person) => {
            const net = Number(person.net);
            return (
              <li key={person.user_id} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-barn-100 text-xs font-bold text-barn-600">
                  {initials(person.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {person.display_name}
                  </p>
                  <p className="tnum text-xs text-ink-faint">
                    Paid {formatMoney(person.paid, symbol)} · share{" "}
                    {formatMoney(person.share, symbol)}
                  </p>
                </div>
                <span
                  className={cn(
                    "tnum shrink-0 text-sm font-bold",
                    net > 0 ? "text-pasture-600" : net < 0 ? "text-clay-600" : "text-ink-faint",
                  )}
                >
                  {net > 0 ? "+" : ""}
                  {formatMoney(net, symbol)}
                </span>
              </li>
            );
          })}
        </ul>

        {!balance.settled && (
          <Button className="mt-4" block onClick={() => setSettling(true)}>
            <Handshake className="h-4 w-4" />
            Settle up
          </Button>
        )}
      </SoftCard>

      <SettleUpDialog
        open={settling}
        onClose={() => setSettling(false)}
        balance={balance}
      />
    </>
  );
}
