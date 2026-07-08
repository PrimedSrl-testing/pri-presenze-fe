import type {
  RegoleEffettive,
  RegoleGlobali,
  DipRegole,
  StepEccesso,
  DestinazioneEccesso,
} from "@/types";

// ─── Input / Output ─────────────────────────────────────────────────────────

export interface CalcoloInput {
  ore_contrattuali: number;
  ore_lavorate: number;
  /** Ore lavorate per giorno della settimana (1=Lun..7=Dom). Opzionale: serve per priorita sabato. */
  ore_per_giorno?: Partial<Record<number, number>>;
  regole: RegoleEffettive;
  /**
   * Se attivo, prima della pipeline le ore in più del mese compensano le ore in meno.
   * Solo il saldo residuo (se positivo) passa alla pipeline (supplementare → straordinario → BOP).
   */
  flg_compensazione_mensile?: boolean;
  /**
   * Bilancio mensile del dipendente (somma di tutte le ore in più/meno accumulate nel mese).
   * Se omesso, viene derivato da ore_lavorate - ore_contrattuali (caso settimanale).
   * Quando il flag compensazione è attivo, questo è il valore che la pipeline deve processare:
   * - positivo: ore residue da assegnare a supplementare/straord/BOP
   * - <=0: nessuna eccedenza, le ore in meno sono state coperte dalle ore in più (no scarico ROL/Ferie)
   */
  bilancio_mensile?: { credito: number; debito: number };
}

export interface CalcoloOutput {
  ore_supplementari: number;
  ore_straordinario_pagabile: number;
  ore_boa: number;
  ore_bop: number;
  ore_bos: number;
  ore_bob: number; // backward compat: somma di tutti i bucket banca ore
  /** Ore di "debito" coperte dalla compensazione mensile (informativo) */
  ore_compensate?: number;
  /** Se compensazione attiva, indica se sono state coperte tutte le ore mancanti */
  compensazione_completa?: boolean;
}

// ─── Merge regole globali + override dipendente ─────────────────────────────

export function mergeRegole(
  globali: RegoleGlobali,
  override: DipRegole | null
): RegoleEffettive {
  return {
    ft_eccesso_pipeline:
      override?.ft_eccesso_pipeline ?? globali.ft_eccesso_pipeline,
    pt_eccesso_pipeline:
      override?.pt_eccesso_pipeline ?? globali.pt_eccesso_pipeline,
    pt_supplementari_attivo:
      override?.pt_supplementari_attivo ?? globali.pt_supplementari_attivo,
    straordinario_max_sett:
      override?.straordinario_max_sett ?? globali.straordinario_max_sett,
    straordinario_max_giorno:
      override?.straordinario_max_giorno ?? globali.straordinario_max_giorno,
    straordinario_priorita_sabato:
      override?.straordinario_priorita_sabato ??
      globali.straordinario_priorita_sabato,
    deficit_pipeline: override?.deficit_pipeline ?? globali.deficit_pipeline,
  };
}

// ─── Calcolo principale ─────────────────────────────────────────────────────

export function calcolaOre(input: CalcoloInput): CalcoloOutput {
  const { ore_contrattuali, ore_lavorate, ore_per_giorno, regole, flg_compensazione_mensile, bilancio_mensile } = input;
  const isPT = ore_contrattuali < 40;

  const result: CalcoloOutput = {
    ore_supplementari: 0,
    ore_straordinario_pagabile: 0,
    ore_boa: 0,
    ore_bop: 0,
    ore_bos: 0,
    ore_bob: 0,
  };

  // ── Step 0: Compensazione Mensile (se attiva) ──────────────────────────
  // La somma debito/credito infra-mese viene risolta PRIMA della pipeline.
  // L'output `remaining` rappresenta il "saldo attivo" netto del mese.
  let remaining: number;
  if (flg_compensazione_mensile && bilancio_mensile) {
    const credito = Math.max(0, Number(bilancio_mensile.credito) || 0);
    const debito = Math.max(0, Number(bilancio_mensile.debito) || 0);
    const compensate = Math.min(credito, debito);
    result.ore_compensate = round2(compensate);
    result.compensazione_completa = credito >= debito;
    const saldoNetto = credito - debito;
    if (saldoNetto <= 0) {
      // Tutte le ore in più hanno coperto (o non bastato a coprire) il debito.
      // In ogni caso, niente eccedenza da passare alla pipeline.
      // Eventuale debito residuo (saldoNetto < 0) sarà gestito dalla logica deficit (ROL/Ferie/BOP), non da calcolaOre.
      return result;
    }
    remaining = saldoNetto;
  } else {
    // Modalità classica (settimanale): nessuna eccedenza se lavorate ≤ contrattuali
    if (ore_lavorate <= ore_contrattuali) {
      return result;
    }
    remaining = ore_lavorate - ore_contrattuali;
  }

  // ── Step 1: Part-time supplementari (ore tra contratto e 40h) ─────────
  if (isPT && regole.pt_supplementari_attivo) {
    const gapTo40 = Math.max(0, 40 - ore_contrattuali);
    result.ore_supplementari = Math.min(remaining, gapTo40);
    remaining -= result.ore_supplementari;
  }

  // ── Step 2: Processa la pipeline eccesso ──────────────────────────────
  const pipeline: StepEccesso[] = isPT
    ? regole.pt_eccesso_pipeline
    : regole.ft_eccesso_pipeline;

  // Track quanto straordinario e stato gia allocato (per rispettare il cap settimanale)
  let straoSettAllocato = 0;

  for (const step of pipeline) {
    if (remaining <= 0) break;

    let allocated: number;

    if (step.dest === "straordinario") {
      // Applica cap legali: max giornaliero e max settimanale
      const capSett = regole.straordinario_max_sett - straoSettAllocato;

      if (regole.straordinario_priorita_sabato && ore_per_giorno) {
        // Priorita sabato: alloca prima le ore del sabato, poi il resto
        allocated = allocaStraordinarioConPrioritaSabato(
          remaining,
          capSett,
          regole.straordinario_max_giorno,
          ore_per_giorno,
          ore_contrattuali
        );
      } else {
        // Senza dettaglio giornaliero: calcolo semplice con cap settimanale
        allocated = Math.min(remaining, capSett);
      }

      straoSettAllocato += allocated;
    } else {
      // BOA, BOP, BOS: applica max_ore se definito
      allocated =
        step.max_ore != null ? Math.min(remaining, step.max_ore) : remaining;
    }

    // Assegna al bucket corrispondente
    addToBucket(result, step.dest, allocated);
    remaining -= allocated;
  }

  // ── Step 3: Safety overflow → BOP ─────────────────────────────────────
  if (remaining > 0) {
    result.ore_bop += round2(remaining);
  }

  // ── Step 4: ore_bob backward compat ───────────────────────────────────
  result.ore_bob = round2(result.ore_boa + result.ore_bop + result.ore_bos);

  // Arrotonda tutto
  result.ore_supplementari = round2(result.ore_supplementari);
  result.ore_straordinario_pagabile = round2(result.ore_straordinario_pagabile);
  result.ore_boa = round2(result.ore_boa);
  result.ore_bop = round2(result.ore_bop);
  result.ore_bos = round2(result.ore_bos);

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addToBucket(
  result: CalcoloOutput,
  dest: DestinazioneEccesso,
  ore: number
) {
  switch (dest) {
    case "boa":
      result.ore_boa += ore;
      break;
    case "straordinario":
      result.ore_straordinario_pagabile += ore;
      break;
    case "bop":
      result.ore_bop += ore;
      break;
    case "bos":
      result.ore_bos += ore;
      break;
  }
}

/**
 * Calcola lo straordinario rispettando la priorita dal sabato.
 *
 * Logica: le ore del sabato vengono considerate per prime come straordinario,
 * poi si aggiungono gli altri giorni (Lun-Ven, poi Dom) fino al cap settimanale.
 * Il cap giornaliero (2h di default) limita quanto straordinario si puo contare per ogni giorno.
 */
function allocaStraordinarioConPrioritaSabato(
  remainingTotale: number,
  capSettimana: number,
  capGiorno: number,
  ore_per_giorno: Partial<Record<number, number>>,
  ore_contrattuali: number
): number {
  // Ore teoriche giornaliere (distribuzione uniforme se non specificato)
  const giorniLavorativi = Object.keys(ore_per_giorno).length || 5;
  const oreTeoricoGiorno = ore_contrattuali / giorniLavorativi;

  // Ordine di priorita: sabato (6) prima, poi gli altri giorni
  const ordineGiorni = [6, 1, 2, 3, 4, 5, 7];

  let totaleAllocato = 0;

  for (const giorno of ordineGiorni) {
    if (totaleAllocato >= capSettimana || totaleAllocato >= remainingTotale)
      break;

    const oreLavGiorno = ore_per_giorno[giorno] ?? 0;
    if (oreLavGiorno <= 0) continue;

    // Eccedenza del giorno rispetto al teorico
    const eccedenzaGiorno = Math.max(0, oreLavGiorno - oreTeoricoGiorno);
    if (eccedenzaGiorno <= 0) continue;

    // Cap giornaliero + cap settimanale residuo + remaining totale
    const allocabile = Math.min(
      eccedenzaGiorno,
      capGiorno,
      capSettimana - totaleAllocato,
      remainingTotale - totaleAllocato
    );

    totaleAllocato += allocabile;
  }

  return totaleAllocato;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Calcolo legacy (fallback senza regole configurate) ─────────────────────

export function calcolaOreLegacy(
  ore_contrattuali: number,
  ore_lavorate: number,
  flg_bos: boolean
): CalcoloOutput {
  const result: CalcoloOutput = {
    ore_supplementari: 0,
    ore_straordinario_pagabile: 0,
    ore_boa: 0,
    ore_bop: 0,
    ore_bos: 0,
    ore_bob: 0,
  };

  if (ore_contrattuali >= 40) {
    result.ore_straordinario_pagabile =
      ore_lavorate > 40 ? Math.min(ore_lavorate - 40, 8) : 0;
    result.ore_bob = Math.max(ore_lavorate - 48, 0);
  } else {
    result.ore_supplementari =
      ore_lavorate > ore_contrattuali
        ? Math.min(ore_lavorate - ore_contrattuali, 40 - ore_contrattuali)
        : 0;
    result.ore_straordinario_pagabile = Math.min(
      Math.max(ore_lavorate - 40, 0),
      8
    );
    result.ore_bob = Math.max(ore_lavorate - 48, 0);
  }

  if (flg_bos) {
    result.ore_bos = result.ore_straordinario_pagabile;
    result.ore_straordinario_pagabile = 0;
  }

  return result;
}
