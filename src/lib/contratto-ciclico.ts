/**
 * Risoluzione del periodo attivo di un contratto ciclico per una data specifica.
 *
 * Un contratto ciclico ha 2 periodi annuali (es. P1 = settembre→aprile full-time,
 * P2 = maggio→agosto part-time). Per ogni data dell'anno è univoco quale periodo è attivo.
 *
 * Regola:
 * - Trasformo i 2 punti di switch (periodo1_da_mese/giorno e periodo2_da_mese/giorno)
 *   nei due "boundary" annuali.
 * - Per una data, vedo a quale dei due intervalli appartiene.
 * - Gli "override_data_switch1/2" (date esplicite) hanno precedenza se valorizzati per quell'anno.
 */

export interface ContrattoCiclicoMinimal {
  periodo1_da_mese: number;
  periodo1_da_giorno: number;
  periodo1_ore_sett: number;
  periodo1_contratto_id?: number | null;
  periodo1_template_id?: number | null;
  periodo2_da_mese: number;
  periodo2_da_giorno: number;
  periodo2_ore_sett: number;
  periodo2_contratto_id?: number | null;
  periodo2_template_id?: number | null;
  override_data_switch1?: string | Date | null;
  override_data_switch2?: string | Date | null;
  attivo: boolean;
}

export interface PeriodoAttivo {
  periodo: 1 | 2;
  ore_sett: number;
  contratto_id: number | null;
  template_id: number | null;
  /** True se questo periodo è part-time (<40h) */
  is_part_time: boolean;
  /** Data di inizio del periodo attivo (per l'anno di riferimento) */
  data_inizio: Date;
  /** Data di fine del periodo attivo (esclusiva: corrisponde all'inizio dell'altro periodo) */
  data_fine: Date;
}

function makeDate(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day);
}

/**
 * Ritorna il periodo attivo (1 o 2) per la data fornita.
 * Se il ciclico non è attivo, ritorna null.
 */
export function getPeriodoAttivo(
  ciclico: ContrattoCiclicoMinimal | null | undefined,
  date: Date,
): PeriodoAttivo | null {
  if (!ciclico || !ciclico.attivo) return null;

  const year = date.getFullYear();

  // Switch points per l'anno della data (con eventuali override)
  const sw1Override = ciclico.override_data_switch1 ? new Date(ciclico.override_data_switch1) : null;
  const sw2Override = ciclico.override_data_switch2 ? new Date(ciclico.override_data_switch2) : null;

  // Usa override solo se nell'anno della data; altrimenti calcola da mese/giorno
  const sw1 = sw1Override && sw1Override.getFullYear() === year
    ? sw1Override
    : makeDate(year, ciclico.periodo1_da_mese, ciclico.periodo1_da_giorno);
  const sw2 = sw2Override && sw2Override.getFullYear() === year
    ? sw2Override
    : makeDate(year, ciclico.periodo2_da_mese, ciclico.periodo2_da_giorno);

  // Periodo 1 va da sw1 a sw2 (esclusivo), periodo 2 va da sw2 a sw1 dell'anno successivo
  // Se sw1 < sw2: [sw1..sw2) = P1, [sw2..sw1+1y) = P2
  // Se sw1 > sw2: [sw2..sw1) = P2, [sw1..sw2+1y) = P1
  const inRange = (d: Date, from: Date, to: Date) => d >= from && d < to;

  let activePeriodo: 1 | 2;
  let dataInizio: Date;
  let dataFine: Date;

  if (sw1.getTime() < sw2.getTime()) {
    if (inRange(date, sw1, sw2)) {
      activePeriodo = 1;
      dataInizio = sw1;
      dataFine = sw2;
    } else if (date >= sw2) {
      activePeriodo = 2;
      dataInizio = sw2;
      dataFine = makeDate(year + 1, ciclico.periodo1_da_mese, ciclico.periodo1_da_giorno);
    } else {
      // date < sw1 → P2 dell'anno precedente
      activePeriodo = 2;
      dataInizio = makeDate(year - 1, ciclico.periodo2_da_mese, ciclico.periodo2_da_giorno);
      dataFine = sw1;
    }
  } else {
    // sw1 >= sw2 (es. sw2=Maggio, sw1=Settembre): P2 da Maggio a Settembre, P1 il resto
    if (inRange(date, sw2, sw1)) {
      activePeriodo = 2;
      dataInizio = sw2;
      dataFine = sw1;
    } else if (date >= sw1) {
      activePeriodo = 1;
      dataInizio = sw1;
      dataFine = makeDate(year + 1, ciclico.periodo2_da_mese, ciclico.periodo2_da_giorno);
    } else {
      activePeriodo = 1;
      dataInizio = makeDate(year - 1, ciclico.periodo1_da_mese, ciclico.periodo1_da_giorno);
      dataFine = sw2;
    }
  }

  const ore_sett = activePeriodo === 1 ? Number(ciclico.periodo1_ore_sett) : Number(ciclico.periodo2_ore_sett);
  const contratto_id = activePeriodo === 1 ? (ciclico.periodo1_contratto_id ?? null) : (ciclico.periodo2_contratto_id ?? null);
  const template_id = activePeriodo === 1 ? (ciclico.periodo1_template_id ?? null) : (ciclico.periodo2_template_id ?? null);

  return {
    periodo: activePeriodo,
    ore_sett,
    contratto_id,
    template_id,
    is_part_time: ore_sett < 40,
    data_inizio: dataInizio,
    data_fine: dataFine,
  };
}

/**
 * Helper: ore contrattuali effettive in una data, considerando il contratto ciclico.
 * Fallback su ore_settimanali del dipendente se non c'è ciclico attivo.
 */
export function getOreContrattualiEffettive(
  ciclico: ContrattoCiclicoMinimal | null | undefined,
  date: Date,
  fallback: number,
): number {
  const p = getPeriodoAttivo(ciclico, date);
  return p ? p.ore_sett : fallback;
}
