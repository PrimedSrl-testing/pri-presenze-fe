import type { Collaboratore, AssegnazioneDipartimento } from "@/types";
import { parseISO, isAfter, isBefore, isEqual } from "date-fns";

export function deptAtDate(emp: Collaboratore, date: string): string | null {
  const d = parseISO(date);
  const sorted = [...emp.assignments].sort(
    (a, b) => parseISO(a.dal).getTime() - parseISO(b.dal).getTime()
  );
  for (const a of sorted) {
    const start = parseISO(a.dal);
    const end = a.al ? parseISO(a.al) : new Date(8640000000000000);
    if (
      (isAfter(d, start) || isEqual(d, start)) &&
      (isBefore(d, end) || isEqual(d, end))
    ) {
      return a.dept;
    }
  }
  return null;
}

export function deptCurrent(emp: Collaboratore): string | null {
  return deptAtDate(emp, new Date().toISOString().split("T")[0]);
}

export function currentAssignment(
  emp: Collaboratore
): AssegnazioneDipartimento | null {
  return emp.assignments.find((a) => a.al === null) ?? null;
}

export function deptHistory(emp: Collaboratore): AssegnazioneDipartimento[] {
  return [...emp.assignments].sort(
    (a, b) => parseISO(b.dal).getTime() - parseISO(a.dal).getTime()
  );
}

export function empInDeptAtDate(
  emp: Collaboratore,
  dept: string,
  date: string
): boolean {
  return deptAtDate(emp, date) === dept;
}

export function empInDeptInPeriod(
  emp: Collaboratore,
  dept: string,
  dal: string,
  al: string
): boolean {
  return emp.assignments.some((a) => {
    if (a.dept !== dept) return false;
    const aStart = parseISO(a.dal);
    const aEnd = a.al ? parseISO(a.al) : new Date(8640000000000000);
    const rStart = parseISO(dal);
    const rEnd = parseISO(al);
    return isBefore(aStart, rEnd) && isAfter(aEnd, rStart);
  });
}
