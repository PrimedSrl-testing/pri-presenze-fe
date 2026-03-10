import { format, parseISO, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { it } from "date-fns/locale";

export function formatDate(dateStr: string, fmt = "dd/MM/yyyy"): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: it });
  } catch {
    return dateStr;
  }
}

export function formatDateLong(dateStr: string): string {
  return formatDate(dateStr, "d MMMM yyyy");
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

export function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isBefore(parseISO(dateStr), new Date());
}

export function isExpiringSoon(dateStr: string | null, days = 30): boolean {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  const now = new Date();
  return isAfter(d, now) && isBefore(d, addDays(now, days));
}

export function getContractUrgency(
  finContratto: string | null
): "critica" | "alta" | "normale" | null {
  if (!finContratto) return null;
  const days = daysUntil(finContratto);
  if (days < 0) return "critica";
  if (days <= 30) return "critica";
  if (days <= 60) return "alta";
  if (days <= 90) return "normale";
  return null;
}

export function formatHours(decimalHours: number): string {
  const h = Math.floor(Math.abs(decimalHours));
  const m = Math.round((Math.abs(decimalHours) - h) * 60);
  const sign = decimalHours < 0 ? "-" : "";
  return `${sign}${h}h${m > 0 ? ` ${m}m` : ""}`;
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}
