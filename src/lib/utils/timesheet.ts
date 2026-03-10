import type { GiornoTimesheet, TimesheetMese, StatoGiorno } from "@/types";
import { format, getDaysInMonth, getDay, parseISO } from "date-fns";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function timeStr(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function genMonthTS(
  empId: string,
  year: number,
  month: number
): TimesheetMese {
  const seed =
    empId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) +
    year * 12 +
    month;
  const rand = seededRandom(seed);
  const days = getDaysInMonth(new Date(year, month - 1));
  const giorni: GiornoTimesheet[] = [];
  let totaleTeoriche = 0;
  let totaleLavorate = 0;

  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = getDay(parseISO(dateStr)); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;

    if (isWeekend) {
      giorni.push({
        date: dateStr,
        timbrature: [],
        oreTeoriche: 0,
        oreLavorate: 0,
        stato: "weekend",
      });
      continue;
    }

    const oreTeoriche = 8;
    totaleTeoriche += oreTeoriche;

    const r = rand();
    let stato: StatoGiorno;
    let oreLavorate = 0;
    let timbrature: GiornoTimesheet["timbrature"] = [];

    if (r < 0.05) {
      // assenza
      stato = "assenza";
    } else if (r < 0.1) {
      // anomalia (timbratura mancante)
      const inH = 8 + Math.floor(rand() * 2);
      const inM = Math.floor(rand() * 60);
      timbrature = [
        {
          ts: `${dateStr}T${timeStr(inH, inM)}:00`,
          tipo: "IN",
        },
      ];
      oreLavorate = 4 + rand() * 3;
      stato = "anomalia";
    } else {
      // normale
      const inH = 8 + Math.floor(rand() * 1);
      const inM = Math.floor(rand() * 30);
      const pausaH = 12 + Math.floor(rand() * 1);
      const pausaM = Math.floor(rand() * 30);
      const rientroH = pausaH + 1;
      const rientroM = Math.floor(rand() * 30);
      const outH = inH + 8 + Math.floor(rand() * 2 - 0.5);
      const outM = Math.floor(rand() * 60);
      timbrature = [
        { ts: `${dateStr}T${timeStr(inH, inM)}:00`, tipo: "IN" },
        { ts: `${dateStr}T${timeStr(pausaH, pausaM)}:00`, tipo: "OUT" },
        { ts: `${dateStr}T${timeStr(rientroH, rientroM)}:00`, tipo: "IN" },
        { ts: `${dateStr}T${timeStr(Math.min(outH, 20), outM)}:00`, tipo: "OUT" },
      ];
      const mattina = pausaH + pausaM / 60 - (inH + inM / 60);
      const pomeriggio = Math.min(outH, 20) + outM / 60 - (rientroH + rientroM / 60);
      oreLavorate = Math.max(0, mattina + pomeriggio);
      stato = Math.abs(oreLavorate - oreTeoriche) <= 0.5 ? "ok" : "anomalia";
    }

    totaleLavorate += oreLavorate;
    giorni.push({
      date: dateStr,
      timbrature,
      oreTeoriche,
      oreLavorate: Math.round(oreLavorate * 100) / 100,
      stato,
    });
  }

  return {
    empId,
    anno: year,
    mese: month,
    giorni,
    totaleTeoriche,
    totaleLavorate: Math.round(totaleLavorate * 100) / 100,
    saldo: Math.round((totaleLavorate - totaleTeoriche) * 100) / 100,
  };
}

export function formatTimbratura(ts: string): string {
  return ts.split("T")[1]?.slice(0, 5) ?? "";
}

export const MESI_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function meseLabel(year: number, month: number): string {
  return `${MESI_LABELS[month - 1]} ${year}`;
}
