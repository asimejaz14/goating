/** Display helpers. Every date the API returns is an ISO `YYYY-MM-DD` string. */

const MONTHS_IN_YEAR = 12;

/** Parse an ISO date as *local* midnight, so a date never shifts a day. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Today as `YYYY-MM-DD` in the user's own timezone — for date-input defaults. */
export function todayISO(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function currentMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

export function formatMonth(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** "2 yr 3 mo", "7 mo", "New born" — readable at a glance on a phone. */
export function formatAge(months: number | null | undefined): string {
  if (months === null || months === undefined) return "Age unknown";
  if (months < 1) return "Newborn";
  if (months < MONTHS_IN_YEAR) return `${months} mo`;
  const years = Math.floor(months / MONTHS_IN_YEAR);
  const rest = months % MONTHS_IN_YEAR;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

export function formatMoney(
  amount: string | number | null | undefined,
  symbol = "₨",
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) return `${symbol}0`;
  const rounded = Math.round(value * 100) / 100;
  const decimals = Number.isInteger(rounded) ? 0 : 2;
  return `${symbol}${rounded.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  })}`;
}

/** The countdown wording used on crossing cards and the dashboard. */
export function formatCountdown(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "Due today";
  if (days < 0) return `${Math.abs(days)} ${plural(Math.abs(days), "day")} overdue`;
  return `${days} ${plural(days, "day")} to go`;
}

/**
 * Pick the singular or plural wording for a count.
 *
 * The plural is given in full rather than as a suffix to append. A suffix only
 * works for words that pluralise by addition — "entry" with an "ies" suffix
 * came out as "entryies" — and spelling out the whole word costs nothing and
 * cannot be got wrong.
 */
export function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

export function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/** "Showing 1–20 of 137" — the result counter under every list. */
export function rangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "No results";
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `Showing ${first}–${last} of ${total}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
