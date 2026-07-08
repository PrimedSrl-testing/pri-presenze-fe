"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";

interface ArticoloBase {
  CDA_ART: string;
  CDA_ART_ALIAS: string | null;
  DES_ARTBASE: string;
  DEV_ARTBASE: string | null;
  TXT_NOTA: string | null;
}

interface Categoria {
  CDA_CATEGORIA_MERCE: string;
}

interface ComponenteRow {
  PRG_DIBA: number;
  PRG_DIBA_COLLEGATO: number | null;
  CDA_ART_BASE: string;
  CDA_ART_COLLEGATO: string | null;
  CDA_ART_NODO: string;
  PRG_ART_NODO: number | null;
  DES_COMPONENTE: string | null;
  DES_ARTBASE?: string | null;
  DEV_ARTBASE?: string | null;
  DES_ART_COLLEGATO?: string | null;
  DES_ARTICOLO: string | null;
  DEV_ARTICOLO: string | null;
  QTA_GIACENZA: number | null;
  CDA_UNIMIS_PRI?: string | null;
  CDA_CATEGORIA_MERCE: string | null;
}

interface ArticoloMatch {
  articolo: ArticoloBase;
  score: number;
  matchedTokens: string[];
  matchedOn: string;
}

interface Trace {
  originalTokens: string[];
  candidates: ArticoloMatch[];
  chosen: ArticoloMatch | null;
  categoria: string | null;
  componentTokens: string[];
  desComponente: string;
  queryUrl: string;
  totalBeforeFilter: number;
}

function stemToken(t: string): string {
  const up = t.toUpperCase();
  if (up.length <= 3) return up;
  // Rimuovo solo la vocale finale (plurali/singolari it: -o/-a/-i/-e).
  // Evito di rimuovere ulteriormente "ES"/"OR"/... perché trasforma parole
  // legittime in prefissi sbagliati (es. ACCES → ACC).
  if (/[AEIOU]$/.test(up)) return up.slice(0, -1);
  return up;
}

// Distanza di Levenshtein fra due stringhe (numero di edit minimi)
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const n = a.length;
  const m = b.length;
  let prev = new Array(m + 1);
  let curr = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // cancellazione
        curr[j - 1] + 1,    // inserimento
        prev[j - 1] + cost  // sostituzione
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

// Calcola la tolleranza per un token in base alla lunghezza
// (1 typo ammesso ogni ~4 caratteri)
function fuzzyTolerance(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 6) return 1;
  if (token.length <= 10) return 2;
  return 3;
}

// true se il token (o una sua versione con pochi errori) compare nel testo.
// Politica di match: richiedo che la parola candidata nel testo sia almeno
// lunga quanto il token — altrimenti "TESTAT" (stem di TESTATE) matcherebbe
// erroneamente "TESTA" in "VITI SENZA TESTA".
function fuzzyTokenInText(token: string, text: string): boolean {
  if (!token || !text) return false;
  if (text.includes(token)) return true;
  const tol = fuzzyTolerance(token);
  if (tol === 0) return false;

  const words = text.split(/[^A-Z0-9]+/).filter(Boolean);
  for (const w of words) {
    if (w.length < token.length) continue; // parola più corta del token: non matcho
    if (w.length - token.length > tol) continue; // parola troppo lunga: non è più lo stesso termine
    if (levenshtein(token, w) <= tol) return true;
    if (w.length > token.length) {
      const prefix = w.slice(0, token.length);
      if (levenshtein(token, prefix) <= tol) return true;
    }
  }
  return false;
}

// ========================================================================
// Estrazione attributi data-driven: niente liste hardcoded di tipi/colori/
// misure. Prendiamo i DEV_ARTICOLO delle varianti trovate, tokenizziamo, e
// calcoliamo i "facet" = token discriminanti (che compaiono in alcune righe
// ma non in tutte). Sono automaticamente le "dimensioni" della scelta.
// ========================================================================

interface Facet {
  key: string;    // stem (usato per matching)
  label: string;  // forma originale più rappresentativa (per display)
  count: number;
  group: "num" | "text";
}

// Stopwords linguistiche italiane e unità di misura: non sono "attributi"
// che il commerciale vuole scegliere, quindi non devono finire nei facet.
// Non hardcoda nulla di business (colori/tipi/misure), solo parole vuote.
const FACET_STOPWORDS = new Set([
  "DA", "DI", "DEL", "DELLA", "DELLO", "DEI", "DELLE",
  "PER", "CON", "SENZA", "SU", "SUL", "SUI",
  "IL", "LA", "LO", "LI", "GLI", "LE",
  "UN", "UNA", "UNO",
  "AL", "ALLA", "ALLE", "AI", "AGLI", "ALLO",
  "TRA", "FRA", "NEL", "NELLA",
  "CM", "MM", "ML", "MT", "PZ", "CP",
]);

function rawTokensForFacets(text: string | null | undefined): string[] {
  return normalize(text || "")
    .split(/\s+|-/)
    .filter(t => t.length >= 2 && !FACET_STOPWORDS.has(t));
}

// Restituisce l'insieme di STEM (singolare/plurale normalizzato) per il
// matching dei facet: "AVVOLGENTE" e "AVVOLGENTI" diventano lo stesso stem
// "AVVOLGENT" e quindi vengono trattati come la stessa parola.
function tokenizeForFacets(text: string | null | undefined): Set<string> {
  return new Set(rawTokensForFacets(text).map(stemToken));
}

function textForFacets(row: ComponenteRow): string {
  return [
    row.DEV_ARTICOLO,
    row.DES_ARTICOLO,
    (row as { DEV_ARTBASE?: string | null }).DEV_ARTBASE,
  ]
    .filter(Boolean)
    .join(" ");
}

function extractFacets(rows: ComponenteRow[]): { num: Facet[]; text: Facet[] } {
  const total = rows.length;
  if (total === 0) return { num: [], text: [] };

  const stemCounts = new Map<string, number>();
  // stem -> occorrenze delle forme originali (per scegliere la label migliore)
  const stemLabels = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const raw = rawTokensForFacets(textForFacets(r));
    const seenStems = new Set<string>();
    for (const tok of raw) {
      const s = stemToken(tok);
      seenStems.add(s);
      if (!stemLabels.has(s)) stemLabels.set(s, new Map());
      const m = stemLabels.get(s)!;
      m.set(tok, (m.get(tok) ?? 0) + 1);
    }
    for (const s of seenStems) stemCounts.set(s, (stemCounts.get(s) ?? 0) + 1);
  }

  const pickLabel = (stem: string): string => {
    const m = stemLabels.get(stem);
    if (!m) return stem;
    let best = stem;
    let bestCount = 0;
    for (const [tok, cnt] of m) {
      if (cnt > bestCount || (cnt === bestCount && tok.length > best.length)) {
        best = tok;
        bestCount = cnt;
      }
    }
    return best;
  };

  const num: Facet[] = [];
  const text: Facet[] = [];
  for (const [key, count] of stemCounts) {
    if (count === total) continue;
    // Accetto anche token con count=1: se non sono davvero discriminanti,
    // li scarterà il raggruppamento mutualmente esclusivo (che richiede
    // coverage = total). Caso tipico: 6 colori, uno per riga, tutti utili.
    const isNum = /^\d+(\/\d+)*$/.test(key);
    const label = pickLabel(key);
    const facet: Facet = { key, label, count, group: isNum ? "num" : "text" };
    if (isNum) num.push(facet);
    else text.push(facet);
  }

  num.sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10));
  text.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { num, text };
}

function rowMatchesFacets(row: ComponenteRow, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const tokens = tokenizeForFacets(textForFacets(row));
  for (const f of selected) {
    if (!tokens.has(f)) return false;
  }
  return true;
}

// Data-driven: trova gruppi di facet che sono **mutualmente esclusivi** tra
// le righe (non compaiono mai insieme). Ogni gruppo rappresenta una
// "dimensione di scelta" per il commerciale, senza serializzare nomi fissi
// come "colore" o "tipo".
function findFacetGroups(
  rows: ComponenteRow[],
  facets: Facet[]
): Facet[][] {
  if (facets.length === 0 || rows.length === 0) return [];

  // Per ogni facet, indice delle righe in cui compare
  const rowsWithFacet = new Map<string, Set<number>>();
  for (const f of facets) rowsWithFacet.set(f.key, new Set());
  rows.forEach((r, i) => {
    const tokens = tokenizeForFacets(textForFacets(r));
    for (const f of facets) {
      if (tokens.has(f.key)) rowsWithFacet.get(f.key)!.add(i);
    }
  });

  // Due facet sono "co-occorrenti" se compaiono almeno in una riga comune
  const coOccurs = (a: string, b: string): boolean => {
    const setA = rowsWithFacet.get(a)!;
    const setB = rowsWithFacet.get(b)!;
    for (const i of setA) if (setB.has(i)) return true;
    return false;
  };

  // Greedy: costruisco gruppi di token mutualmente esclusivi, partendo dai
  // facet con più occorrenze.
  const remaining = [...facets].sort((a, b) => b.count - a.count);
  const groups: Facet[][] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const group: Facet[] = [seed];
    for (let i = 0; i < remaining.length; ) {
      const cand = remaining[i];
      const compatible = group.every(g => !coOccurs(g.key, cand.key));
      if (compatible) {
        group.push(cand);
        remaining.splice(i, 1);
      } else {
        i++;
      }
    }
    groups.push(group);
  }

  const coverage = (g: Facet[]): number => {
    const covered = new Set<number>();
    for (const f of g) for (const i of rowsWithFacet.get(f.key)!) covered.add(i);
    return covered.size;
  };

  // Un gruppo è utile come step wizard solo se:
  //  - ha almeno 2 opzioni (altrimenti non c'è scelta)
  //  - copre tutte le righe (ogni variante ha esattamente uno dei suoi token):
  //    altrimenti sarebbe una scelta "parziale" confusa per l'utente
  const validGroups = groups.filter(g => g.length >= 2 && coverage(g) === rows.length);

  // Ordine di proposta degli step:
  //  1) gruppi numerici (misure) prima
  //  2) poi per cardinalità decrescente (più valori = più discriminante)
  validGroups.sort((a, b) => {
    const aNum = a.every(f => f.group === "num");
    const bNum = b.every(f => f.group === "num");
    if (aNum !== bNum) return aNum ? -1 : 1;
    return b.length - a.length;
  });

  return validGroups;
}

function groupTitle(group: Facet[]): string {
  if (group.length === 0) return "Scegli";
  if (group.every(f => f.group === "num")) return "Che misura?";
  if (group.length === 2) return `${group[0].label} o ${group[1].label}?`;
  return "Quale di questi?";
}

// Dato un set di padri (CDA_ART_COLLEGATO + descrizione), calcola per ogni
// padre una label compatta con i soli token distintivi (es. "REGOLABILE"
// invece di "BUSTE ACCES. UNIKVER PIEDINO REGOLABILE"). Data-driven:
// rimuove i token comuni a tutti i padri e i sinonimi/prefissi (ACCES vs
// ACCESSORI → entrambi esclusi).
function computeParentLabels(
  parents: { key: string; desc: string }[]
): Map<string, string> {
  const labels = new Map<string, string>();
  if (parents.length === 0) return labels;
  if (parents.length === 1) {
    labels.set(parents[0].key, parents[0].desc || "Unico ramo");
    return labels;
  }

  // Tokenizzo ogni padre con parole ORIGINALI (non stemmate) per la label,
  // ma uso gli stem per individuare token comuni a tutti i padri.
  const originalTokensByParent = new Map<string, string[]>();
  const stemsByParent = new Map<string, Set<string>>();
  for (const p of parents) {
    const toks = rawTokensForFacets(p.desc);
    originalTokensByParent.set(p.key, toks);
    stemsByParent.set(p.key, new Set(toks.map(stemToken)));
  }

  // Stem presenti in TUTTI i padri: parte del "nome comune", non servono
  const firstStems = stemsByParent.get(parents[0].key)!;
  const commonStems = new Set<string>();
  for (const s of firstStems) {
    if (parents.every(p => stemsByParent.get(p.key)!.has(s))) commonStems.add(s);
  }

  // Per ogni padre: token originali il cui stem NON è comune (distintivi)
  const distinctiveByParent = new Map<string, string[]>();
  for (const p of parents) {
    const list = originalTokensByParent.get(p.key)!.filter(
      t => !commonStems.has(stemToken(t))
    );
    distinctiveByParent.set(p.key, list);
  }

  // Rimuovo coppie "sinonime" (un token è prefisso dell'altro con lunghezza ≥4)
  const allDistinctive = Array.from(distinctiveByParent.values()).flat();
  const toRemove = new Set<string>();
  for (let i = 0; i < allDistinctive.length; i++) {
    for (let j = i + 1; j < allDistinctive.length; j++) {
      const a = allDistinctive[i];
      const b = allDistinctive[j];
      if (a === b) continue;
      const shorter = a.length < b.length ? a : b;
      const longer = a.length < b.length ? b : a;
      if (shorter.length >= 4 && longer.startsWith(shorter)) {
        toRemove.add(a);
        toRemove.add(b);
      }
    }
  }

  for (const p of parents) {
    const remaining = distinctiveByParent.get(p.key)!
      .filter(t => !toRemove.has(t))
      .sort((x, y) => y.length - x.length); // parole più lunghe prima
    // Se il padre non ha token distintivi (rispetto agli altri), è la
    // configurazione "di serie": etichetta breve "STANDARD" per distinguerlo
    // dai padri con varianti.
    labels.set(p.key, remaining.length > 0 ? remaining.join(" ") : "STANDARD");
  }
  return labels;
}

function componentText(row: ComponenteRow): string {
  return normalize(
    [
      row.DES_COMPONENTE,
      row.DES_ARTICOLO,
      row.DEV_ARTICOLO,
      (row as { DES_ARTBASE?: string | null }).DES_ARTBASE,
      (row as { DEV_ARTBASE?: string | null }).DEV_ARTBASE,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function parentText(row: ComponenteRow): string {
  return normalize((row as { DES_ART_COLLEGATO?: string | null }).DES_ART_COLLEGATO || "");
}

function componentMatches(row: ComponenteRow, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const comp = componentText(row);
  const full = `${comp} ${parentText(row)}`;
  const stems = tokens.map(stemToken);
  // tutti i token devono stare nel contesto globale (componente + padre)
  if (!stems.every(s => full.includes(s))) return false;
  // ma almeno uno deve stare nel componente stesso (così evitiamo "fratelli" falsi positivi)
  return stems.some(s => comp.includes(s));
}

function isContenitore(row: ComponenteRow): boolean {
  const dev = normalize(
    (row as { DES_ARTBASE?: string | null }).DES_ARTBASE || row.DES_COMPONENTE || ""
  );
  const codice = (row.CDA_ART_NODO || "").toUpperCase();
  return /(^|\s)(BUST|KIT|CAMPION)/.test(dev) || /^10(BUS|CAM|KIT)/.test(codice);
}

// Componenti "di servizio" che non sono mai il risultato cercato dal commerciale
const NOISE_PATTERNS = [
  /\bVIT[EI]?\b/, /\bCLIP/, /\bTAPP[OI]/, /\bRIVETT/, /\bFISCHER\b/,
  /\bTASSELL/, /\bNASTR/, /\bSCOTCH\b/, /\bCOLLA\b/, /\bFASCETT/,
  /\bGUAIN/, /\bSTAFFA/, /\bQR[\s_]?COD/, /\bISTRUZION/, /\bMANUAL/,
  /\bETICH/, /\bCODICE[\s_]A[\s_]BARR/, /\bIMBALL/,
];

function isNoise(row: ComponenteRow): boolean {
  const desc = normalize(
    (row as { DES_ARTBASE?: string | null }).DES_ARTBASE || row.DES_COMPONENTE || ""
  );
  return NOISE_PATTERNS.some(re => re.test(desc));
}

function componentMatchesExt(row: ComponenteRow, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const comp = componentText(row);
  const parent = parentText(row);
  const full = `${comp} ${parent}`;
  const stems = tokens.map(stemToken);
  // Tutti i token devono stare nel contesto globale (componente + padre).
  // Volutamente largo: così raccogliamo sia i pezzi che hanno il token nel
  // nome (es. "30PIE10 PIEDINI PER ZANZARIERE") sia i pezzi sotto un padre
  // che descrive il componente (es. "BUSTA PIEDINO NASCOSTO" contiene solo
  // cordine/molle/viti — il "piedino nascosto" è la configurazione).
  // Il filtro fine (solo piedini fisici dove presenti) viene applicato dopo
  // che l'utente ha scelto il padre.
  return stems.every(s => fuzzyTokenInText(s, full));
}

// Vero se una riga ha almeno un token del componente cercato nel proprio
// nome (non nel padre). Usato per raffinare i risultati dopo la scelta del
// padre: se esistono pezzi "espliciti" li privilegiamo.
function hasTokenInComponent(row: ComponenteRow, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const comp = componentText(row);
  const stems = tokens.map(stemToken);
  return stems.some(s => fuzzyTokenInText(s, comp));
}

const STOPWORDS = new Set([
  "per", "del", "della", "dello", "dei", "delle", "di", "da", "dal", "dalla",
  "il", "la", "lo", "i", "gli", "le", "un", "una", "uno", "con", "senza", "su",
  "ho", "hai", "bisogno", "serve", "voglio", "vorrei", "cerco", "cerca", "trova",
  "mi", "ti", "ci", "si", "cliente", "dice", "dicendo", "chiede", "vuole",
  "articolo", "prodotto", "finito", "codice", "al", "alla", "allo", "ai",
  "che", "come", "quale", "quali", "e", "o", "è", "sono",
]);

const fmt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

function scoreArticolo(
  tokens: string[],
  art: ArticoloBase,
  categorieSet: Set<string>
): ArticoloMatch | null {
  const alias = normalize(art.CDA_ART_ALIAS);
  const code = normalize(art.CDA_ART);
  const des = normalize(art.DES_ARTBASE);
  const dev = normalize(art.DEV_ARTBASE);
  const nota = normalize(art.TXT_NOTA);

  let score = 0;
  const matched: string[] = [];
  let matchedOn = "";

  for (const t of tokens) {
    if (t.length < 2) continue;
    if (categorieSet.has(t)) continue;

    if (alias === t || code === t) {
      score += 120;
      matched.push(t);
      matchedOn = matchedOn || (alias === t ? "ALIAS esatto" : "CDA_ART esatto");
      continue;
    }
    if (alias && alias.includes(t)) {
      score += 80;
      matched.push(t);
      matchedOn = matchedOn || "ALIAS";
      continue;
    }
    if (code && code.includes(t)) {
      score += 70;
      matched.push(t);
      matchedOn = matchedOn || "CDA_ART";
      continue;
    }
    if (des && new RegExp(`\\b${t}\\b`).test(des)) {
      score += 60;
      matched.push(t);
      matchedOn = matchedOn || "DES_ARTBASE";
      continue;
    }
    if (dev && new RegExp(`\\b${t}\\b`).test(dev)) {
      score += 40;
      matched.push(t);
      matchedOn = matchedOn || "DEV_ARTBASE";
      continue;
    }
    if (nota && nota.includes(t)) {
      score += 15;
      matched.push(t);
      matchedOn = matchedOn || "NOTE";
    }
  }

  if (score === 0) return null;
  return { articolo: art, score, matchedTokens: matched, matchedOn };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

interface VariantRow {
  CDA_ART_NODO: string;
  PRG_ART_NODO: number | null;
  DES_ARTICOLO: string | null;
  DEV_ARTICOLO: string | null;
  QTA_GIACENZA: number | null;
  CDA_UNIMIS_PRI?: string | null;
}

async function expandVariants(rows: ComponenteRow[]): Promise<ComponenteRow[]> {
  if (rows.length === 0) return rows;

  // Dedup per chiave (CDA_ART_NODO + distinta di riferimento) — niente chiamate doppie
  const keyOf = (r: ComponenteRow) =>
    `${r.CDA_ART_NODO}|${r.PRG_DIBA_COLLEGATO ?? r.PRG_DIBA ?? 0}`;

  const unique = new Map<string, ComponenteRow>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!unique.has(k)) unique.set(k, r);
  }

  // Chiamo /dettagli in parallelo con batching a 5
  const entries = Array.from(unique.entries());
  const variantsByKey = new Map<string, VariantRow[]>();

  const runBatch = async (batch: [string, ComponenteRow][]) => {
    await Promise.all(
      batch.map(async ([k, row]) => {
        const params = new URLSearchParams();
        const prgDiba = row.PRG_DIBA_COLLEGATO ?? row.PRG_DIBA;
        if (prgDiba != null) params.set("prg_diba", String(prgDiba));
        params.set("cda_art_nodo", row.CDA_ART_NODO);
        try {
          const data = await fetchJson<VariantRow[]>(
            `/api/ricerca-smart/dettagli?${params.toString()}`
          );
          variantsByKey.set(k, data || []);
        } catch (e) {
          console.warn(`dettagli ${row.CDA_ART_NODO}`, e);
          variantsByKey.set(k, []);
        }
      })
    );
  };

  for (let i = 0; i < entries.length; i += 5) {
    await runBatch(entries.slice(i, i + 5));
  }

  // Costruisco l'elenco espanso: ogni riga diventa N righe (una per variante)
  const expanded: ComponenteRow[] = [];
  for (const row of rows) {
    const variants = variantsByKey.get(keyOf(row)) ?? [];
    if (variants.length > 0) {
      for (const v of variants) {
        expanded.push({
          ...row,
          CDA_ART_NODO: v.CDA_ART_NODO ?? row.CDA_ART_NODO,
          PRG_ART_NODO: v.PRG_ART_NODO,
          DES_ARTICOLO: v.DES_ARTICOLO ?? row.DES_ARTICOLO,
          DEV_ARTICOLO: v.DEV_ARTICOLO ?? row.DEV_ARTICOLO,
          QTA_GIACENZA: v.QTA_GIACENZA,
          CDA_UNIMIS_PRI: v.CDA_UNIMIS_PRI ?? row.CDA_UNIMIS_PRI,
        });
      }
    } else {
      // niente varianti dal backend → tengo la riga originale
      expanded.push(row);
    }
  }

  // Dedupplico anche l'output finale (stesso CDA_ART_NODO + PRG_ART_NODO)
  const seen = new Set<string>();
  return expanded.filter(r => {
    const k = `${r.CDA_ART_NODO}|${r.PRG_ART_NODO ?? "x"}|${r.PRG_DIBA_COLLEGATO ?? r.PRG_DIBA ?? 0}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Riallinea QTA_GIACENZA alla vista RIC_GIAC_INTRANET_V2 (quella che vede l'intranet).
// Mutua i valori in-place sulle righe passate. In caso di errore upstream non fa nulla.
async function overrideWithV2Giacenze(...groups: ComponenteRow[][]): Promise<void> {
  const allRows = groups.flat();
  if (allRows.length === 0) return;
  const cdaArts = Array.from(new Set(allRows.map(r => r.CDA_ART_NODO).filter(Boolean)));
  if (cdaArts.length === 0) return;

  try {
    const res = await fetch("/api/ricerca-smart/giacenze-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cdaArts }),
      cache: "no-store",
    });
    if (!res.ok) return;
    const { giacenze } = (await res.json()) as { giacenze: Record<string, number | null> };
    for (const r of allRows) {
      const key = `${r.CDA_ART_NODO}|${r.PRG_ART_NODO ?? ""}`;
      if (Object.prototype.hasOwnProperty.call(giacenze, key)) {
        r.QTA_GIACENZA = giacenze[key];
      }
    }
  } catch (e) {
    console.warn("override giacenze v2", e);
  }
}

export function SmartSearch() {
  const [articoli, setArticoli] = useState<ArticoloBase[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [input, setInput] = useState("");
  // Articolo "lockato" a mano dall'utente (campo opzionale separato). Se
  // valorizzato, lo usiamo come PF forzato saltando il parsing dell'input.
  const [manualArticolo, setManualArticolo] = useState<ArticoloBase | null>(null);
  const [articoloPicker, setArticoloPicker] = useState("");
  const [showArticoloSuggestions, setShowArticoloSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [results, setResults] = useState<ComponenteRow[] | null>(null);
  const [containers, setContainers] = useState<ComponenteRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  // dump completo della distinta del prodotto selezionato, usato per mostrare
  // il contenuto di una busta senza fare nuove chiamate
  const [distintaRaw, setDistintaRaw] = useState<ComponenteRow[]>([]);
  // cache del dump per ciascun CDA_ART: pre-caricato quando l'utente
  // seleziona l'articolo, così al Trova la tabella è istantanea.
  const [distintaCache, setDistintaCache] = useState<Record<string, ComponenteRow[]>>({});
  const [prefetching, setPrefetching] = useState(false);

  // Facet selezionati: set di stem (chiavi tecniche). Un risultato passa solo
  // se il suo DEV_ARTICOLO contiene tutti gli stem qui dentro.
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
  // Label originali per i facet selezionati (solo per display)
  const [facetLabelMap, setFacetLabelMap] = useState<Record<string, string>>({});
  // Il "contenitore" selezionato dall'utente (CDA_ART_COLLEGATO): primo step
  // del wizard, basato sulla struttura della distinta base.
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const toggleFacet = (key: string, label?: string) => {
    setSelectedFacets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (label) {
      setFacetLabelMap(prev => {
        const next = { ...prev };
        if (next[key]) delete next[key];
        else next[key] = label;
        return next;
      });
    }
  };
  const clearFacet = (key: string) => {
    setSelectedFacets(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setFacetLabelMap(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  // True quando l'utente cerca esplicitamente un contenitore (busta/kit/accessori):
  // in questo caso saltiamo il wizard tipo/colore, che è sensato solo per
  // componenti come piedini/cassonetti, non per le buste accessori.
  const [isContainerSearch, setIsContainerSearch] = useState(false);

  // Se la ricerca non ha identificato un prodotto finito, salviamo qui i
  // parametri per ripartire quando l'utente sceglie il PF dall'autocomplete.
  interface PendingSearch {
    tokens: string[];
    componentTokens: string[];
    desComponente: string;
    categoriaToken: string | null;
    candidates: ArticoloMatch[];
    suggested: ArticoloBase[]; // articoli che hanno effettivamente questo componente nella distinta
  }
  const [pending, setPending] = useState<PendingSearch | null>(null);
  const [pfPickerInput, setPfPickerInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [art, cat] = await Promise.all([
          fetchJson<ArticoloBase[]>("/api/ricerca-smart/articoli-base"),
          fetchJson<Categoria[]>("/api/ricerca-smart/categoria-articoli"),
        ]);
        if (!cancelled) {
          setArticoli(art || []);
          setCategorie(cat || []);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setBootstrapErr("Impossibile caricare articoli / categorie dal backend magazzino.");
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categorieSet = useMemo(
    () => new Set(categorie.map((c) => normalize(c.CDA_CATEGORIA_MERCE))),
    [categorie]
  );

  // Pre-fetch: appena l'utente seleziona l'articolo, scarico la sua distinta
  // in background per essere pronto al momento del Trova.
  useEffect(() => {
    if (!manualArticolo) return;
    const cda = manualArticolo.CDA_ART;
    if (distintaCache[cda]) return;
    let cancelled = false;
    setPrefetching(true);
    (async () => {
      try {
        const data = await fetchJson<ComponenteRow[]>(
          `/api/ricerca-smart?cda_art=${encodeURIComponent(cda)}`
        );
        if (!cancelled) {
          setDistintaCache(prev => ({ ...prev, [cda]: data }));
        }
      } catch (e) {
        console.warn("prefetch distinta", e);
      } finally {
        if (!cancelled) setPrefetching(false);
      }
    })();
    return () => { cancelled = true; };
    // distintaCache è omesso volutamente: il check iniziale basta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualArticolo]);

  const resetSearchState = () => {
    setErr(null);
    setResults(null);
    setContainers([]);
    setTrace(null);
    setSelectedFacets(new Set());
    setFacetLabelMap({});
    setSelectedParent(null);
    setPending(null);
    setPfPickerInput("");
    setIsContainerSearch(false);
    setDistintaRaw([]);
  };

  // Esegue la ricerca completa data una scelta esplicita di prodotto finito.
  const runSearchFor = async (
    articolo: ArticoloBase,
    componentTokens: string[],
    desComponente: string,
    categoriaToken: string | null,
    tokens: string[],
    candidates: ArticoloMatch[],
    matchedOn: string,
    score: number
  ) => {
    const chosen: ArticoloMatch = {
      articolo,
      score,
      matchedTokens: [],
      matchedOn,
    };

    const params = new URLSearchParams();
    params.set("cda_art", articolo.CDA_ART);
    if (categoriaToken) params.set("cda_categoria_merce", categoriaToken);

    const queryUrl = `/api/ricerca-smart?${params.toString()}`;

    setLoading(true);
    try {
      // Uso il dump pre-caricato se presente, altrimenti chiamo il backend.
      const cached = distintaCache[articolo.CDA_ART];
      const data = cached ?? await fetchJson<ComponenteRow[]>(queryUrl);
      if (!cached) {
        // aggiorno la cache per eventuali ricerche successive sullo stesso articolo
        setDistintaCache(prev => ({ ...prev, [articolo.CDA_ART]: data }));
      }

      // Il backend restituisce:
      // - righe con CDA_ART_BASE = codice articolo (i componenti della distinta)
      // - righe con CDA_ART_BASE = "NO DIBA" (componenti dello stesso reparto
      //   base ma non direttamente in distinta — es. testate UNIK 40 colorate
      //   usate in AMBRA ma condivise con altri prodotti).
      // Li teniamo entrambi, poi il matching fine filtrerà per pertinenza.
      const articoloNorm = normalize(articolo.CDA_ART);
      const afterProductFilter = data.filter(r => {
        const base = normalize(r.CDA_ART_BASE);
        return base === articoloNorm || base === "NO DIBA";
      });
      // salviamo il dump completo per poter mostrare il contenuto delle buste
      // senza altre chiamate al backend (sono già qui come righe con
      // CDA_ART_COLLEGATO = codice della busta)
      setDistintaRaw(afterProductFilter);

      // Se l'utente sta cercando esplicitamente un contenitore (busta/kit/
      // accessori/campione), il match deve essere stretto sul componente
      // stesso: altrimenti matcherebbero anche tutti i "fratelli" (viti,
      // clips, QR code) contenuti nella busta perché il loro padre ha
      // "BUSTE ACCESSORI..." nel DES_ART_COLLEGATO.
      const stems = componentTokens.map(stemToken);
      const cercaContenitore = stems.some(s => /^BUST|^KIT|^ACCESS|^CAMPION/.test(s));
      setIsContainerSearch(cercaContenitore);

      const matchFn = cercaContenitore
        ? (r: ComponenteRow) => {
            const comp = componentText(r);
            return stems.every(s => fuzzyTokenInText(s, comp));
          }
        : (r: ComponenteRow) => componentMatchesExt(r, componentTokens);

      const matched = componentTokens.length > 0
        ? afterProductFilter.filter(matchFn)
        : afterProductFilter;

      let fisici: ComponenteRow[];
      let cont: ComponenteRow[];
      if (cercaContenitore) {
        fisici = matched.filter(r => isContenitore(r));
        cont = matched.filter(r => !isContenitore(r));
      } else {
        fisici = matched.filter(r => !isContenitore(r));
        cont = matched.filter(r => isContenitore(r));

        // Aggiungo anche i contenitori-PADRI delle righe matched: sono le
        // buste in cui i componenti sono fisicamente contenuti, anche se il
        // nome della busta non contiene il token cercato (es. busta AMBRA
        // base senza "PIEDINO" nel nome ma che contiene 10PIE).
        const parentCdas = new Set(
          matched.map(r => r.CDA_ART_COLLEGATO).filter((c): c is string => !!c)
        );
        const alreadySeen = new Set(cont.map(r => r.CDA_ART_NODO));
        const parentContainerRows = afterProductFilter.filter(r =>
          parentCdas.has(r.CDA_ART_NODO) && isContenitore(r) && !alreadySeen.has(r.CDA_ART_NODO)
        );
        cont = [...cont, ...parentContainerRows];

        // Fallback: nessun fisico ma ci sono contenitori → mostra quelli come
        // risultato principale.
        if (fisici.length === 0 && cont.length > 0) {
          fisici = cont;
          cont = [];
        }
      }

      const [fisiciExpanded, contExpanded] = await Promise.all([
        expandVariants(fisici),
        expandVariants(cont),
      ]);

      await overrideWithV2Giacenze(fisiciExpanded, contExpanded);

      const byGiacenza = (a: ComponenteRow, b: ComponenteRow) => {
        const ga = a.QTA_GIACENZA ?? -1;
        const gb = b.QTA_GIACENZA ?? -1;
        return gb - ga;
      };
      fisiciExpanded.sort(byGiacenza);
      contExpanded.sort(byGiacenza);

      // Auto-selezione padre: solo se l'utente ha scritto un QUALIFICATORE
      // (es. "regolabili", "nascosti") che è distintivo di un singolo padre.
      // Il PRIMO token è considerato il "nome del componente" cercato
      // (es. "piedini") e NON viene usato per auto-selezionare il padre:
      // altrimenti cercare "piedini" su AMBRA selezionerebbe la busta
      // "PIEDINO NASCOSTO" escludendo le altre buste con piedini dentro.
      const parentsMap = new Map<string, string>();
      for (const r of fisiciExpanded) {
        const key = r.CDA_ART_COLLEGATO ?? "__NONE__";
        if (!parentsMap.has(key)) {
          parentsMap.set(key, (r.DES_ART_COLLEGATO?.trim()) || "");
        }
      }
      let autoParent: string | null = null;
      if (parentsMap.size > 1 && componentTokens.length > 1) {
        // Tokens "qualificatori": tutti tranne il primo (nome componente).
        const qualifierStems = new Set(componentTokens.slice(1).map(stemToken));
        if (qualifierStems.size > 0) {
          const parentArr = Array.from(parentsMap.entries()).map(([k, d]) => ({ key: k, desc: d }));
          const labels = computeParentLabels(parentArr);
          const matching: string[] = [];
          for (const [key, label] of labels) {
            const labelTokens = tokenizeForFacets(label);
            for (const t of labelTokens) {
              if (qualifierStems.has(stemToken(t))) {
                matching.push(key);
                break;
              }
            }
          }
          if (matching.length === 1) autoParent = matching[0];
        }
      }
      setSelectedParent(autoParent);
      // Non pre-seleziono facet: l'utente sceglie sempre dagli step. Così
      // token ambigui (es. "PIEDINI" stem di "PIEDINO") non bloccano
      // erroneamente i risultati.
      setSelectedFacets(new Set());

      setTrace({
        originalTokens: tokens,
        candidates,
        chosen,
        categoria: categoriaToken,
        componentTokens,
        desComponente,
        queryUrl,
        totalBeforeFilter: data.length,
      });
      setResults(fisiciExpanded);
      setContainers(contExpanded);
      setPending(null);
    } catch (e) {
      console.error(e);
      setErr("Errore nella chiamata al backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    resetSearchState();

    const text = input.trim();
    if (!text) return;

    const tokens = tokenize(text);
    if (tokens.length === 0) {
      setErr("Testo vuoto o non interpretabile.");
      return;
    }

    const categoriaToken = tokens.find((t) => categorieSet.has(t)) ?? null;

    // Se l'utente ha lockato un articolo nel campo separato, lo usiamo come PF
    // e ignoriamo il parsing PF dal testo.
    const manualMatch: ArticoloMatch | null = manualArticolo
      ? { articolo: manualArticolo, score: 999, matchedTokens: [], matchedOn: "campo Articolo" }
      : null;

    const allMatches = manualArticolo
      ? [manualMatch!]
      : articoli
          .map((a) => scoreArticolo(tokens, a, categorieSet))
          .filter((m): m is ArticoloMatch => m !== null)
          .sort((a, b) => b.score - a.score);

    const chosen = manualMatch ?? (allMatches[0] && allMatches[0].score >= 60 ? allMatches[0] : null);

    // Quando l'articolo è manuale, i token del testo sono TUTTI per il componente
    const matchedSet = new Set(manualMatch ? [] : (chosen?.matchedTokens ?? []));
    const componentTokens = tokens.filter(
      (t) =>
        !STOPWORDS.has(t.toLowerCase()) &&
        !matchedSet.has(t) &&
        t !== categoriaToken &&
        t.length > 1
    );
    const desComponente = componentTokens.join(" ");

    // Nota: l'auto-selezione dei facet dai token input la facciamo dopo aver
    // ottenuto i risultati, quando sappiamo quali facet esistono davvero.

    if (!chosen && !desComponente) {
      setErr('Non ho capito la richiesta. Prova con "piedino regolabile per UNIKVER".');
      return;
    }

    // Prodotto finito identificato → vai dritto alla ricerca
    if (chosen) {
      await runSearchFor(
        chosen.articolo,
        componentTokens,
        desComponente,
        categoriaToken,
        tokens,
        allMatches.slice(0, 5),
        chosen.matchedOn,
        chosen.score
      );
      return;
    }

    // Senza prodotto finito: l'utente deve sceglierlo dal picker.
    // La distinta base è la centralità della ricerca — non ha senso
    // cercare un componente senza contesto del prodotto.
    setPending({
      tokens,
      componentTokens,
      desComponente,
      categoriaToken,
      candidates: allMatches.slice(0, 5),
      suggested: [],
    });
  };

  // Callback usata dall'autocomplete "Per quale articolo?"
  const pickProduct = (articolo: ArticoloBase) => {
    if (!pending) return;
    runSearchFor(
      articolo,
      pending.componentTokens,
      pending.desComponente,
      pending.categoriaToken,
      pending.tokens,
      pending.candidates,
      "scelto manualmente",
      999
    );
  };

  // ======== DERIVAZIONI DATA-DRIVEN ========

  // Se la maggioranza dei risultati è direttamente sulla distinta (senza un
  // sotto-contenitore), le poche righe in sub-distinte sono rumore per il
  // commerciale (es. testate AMBRA: 9 dirette + 3-4 in sub-kit). Skippiamo
  // completamente il raggruppamento per padre e filtriamo al ramo principale.
  const majorityDirect = useMemo(() => {
    if (!results || results.length === 0) return false;
    const direct = results.filter(r => !r.CDA_ART_COLLEGATO).length;
    return direct >= results.length * 0.5;
  }, [results]);

  // PRIMO STEP — gruppi per contenitore/padre nella distinta.
  // Si attiva SOLO quando esistono diversi sub-contenitori significativi
  // (es. "piedini UNIKVER" sotto busta REGOLABILE vs busta ACCULTO).
  const parentGroups = useMemo(() => {
    if (!results) return [];
    if (majorityDirect) return []; // niente raggruppamento per padre
    const map = new Map<string, { desc: string; count: number }>();
    for (const r of results) {
      const key = r.CDA_ART_COLLEGATO ?? "__NONE__";
      const desc = (r.DES_ART_COLLEGATO?.trim()) || "Direttamente sulla distinta";
      if (!map.has(key)) map.set(key, { desc, count: 0 });
      map.get(key)!.count += 1;
    }
    const parentList = Array.from(map.entries()).map(([key, v]) => ({
      key,
      desc: v.desc,
    }));
    const compactLabels = computeParentLabels(parentList);
    return Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: compactLabels.get(key) || v.desc,
      fullDesc: v.desc,
      count: v.count,
    }));
  }, [results, majorityDirect]);

  // Righe dopo aver scelto il contenitore (o tutte se non serve sceglierlo)
  const afterParentFilter = useMemo(() => {
    if (!results) return [];
    if (majorityDirect) return results.filter(r => !r.CDA_ART_COLLEGATO);
    if (!selectedParent) return results;
    const rowsInParent = results.filter(r => (r.CDA_ART_COLLEGATO ?? "__NONE__") === selectedParent);
    // Se ci sono componenti che hanno il token cercato nel proprio nome
    // (es. "30PIE10 PIEDINI PER ZANZARIERE"), mostro solo quelli. Altrimenti
    // (es. busta PIEDINO NASCOSTO di AMBRA, dove dentro ci sono
    // cordine/molle/viti) mostro tutti i componenti della busta.
    const tokens = trace?.componentTokens ?? [];
    if (tokens.length > 0) {
      const precise = rowsInParent.filter(r => hasTokenInComponent(r, tokens));
      if (precise.length > 0) return precise;
    }
    return rowsInParent;
  }, [results, selectedParent, majorityDirect, trace]);

  // Righe finali: padre + facet applicati
  const finalRows = useMemo(() => {
    return afterParentFilter.filter(r => rowMatchesFacets(r, selectedFacets));
  }, [afterParentFilter, selectedFacets]);

  // Facet calcolati sulle righe filtrate per padre (non su tutti i results),
  // così non emergono attributi che non appartengono al padre scelto.
  const baseFacets = useMemo(() => extractFacets(afterParentFilter), [afterParentFilter]);

  // Gruppi di facet mutualmente esclusivi
  const facetGroups = useMemo(
    () => findFacetGroups(afterParentFilter, [...baseFacets.num, ...baseFacets.text]),
    [afterParentFilter, baseFacets]
  );

  // Primo gruppo non ancora "risolto" (nessuno dei suoi facet in selectedFacets):
  // è il prossimo step da proporre all'utente. Salto lo step solo quando è
  // piccolo (≤ 2 opzioni) e le righe rimanenti sono già poche — esempio
  // tipico: DX/SX dopo aver già scelto tipo+colore. Per gruppi grandi (3+
  // opzioni, es. colori) chiedo sempre: guida il commerciale fino al
  // singolo progressivo.
  const currentStepGroup = useMemo(() => {
    const rowsAfterFacets = afterParentFilter.filter(r => rowMatchesFacets(r, selectedFacets));
    for (const g of facetGroups) {
      if (g.length < 2) continue;
      const hasSelected = g.some(f => selectedFacets.has(f.key));
      if (hasSelected) continue;
      // Skip solo se gruppo piccolo (<=2) e già poche righe
      if (g.length <= 2 && rowsAfterFacets.length <= g.length) continue;
      return g;
    }
    return null;
  }, [facetGroups, selectedFacets, afterParentFilter]);

  // Conteggio dinamico per ciascun facet: righe che rimarrebbero scegliendo
  // quel facet (utile da mostrare nei chip dello step).
  const countIfSelected = useMemo(() => {
    return (key: string) => {
      const next = new Set(selectedFacets);
      next.add(key);
      return afterParentFilter.filter(r => rowMatchesFacets(r, next)).length;
    };
  }, [afterParentFilter, selectedFacets]);

  // Conteggio totale giacenza (sommando le varianti mostrate)
  const totalGiacenza = useMemo(
    () => finalRows.reduce((s, r) => s + (r.QTA_GIACENZA ?? 0), 0),
    [finalRows]
  );

  // Contenitori filtrati:
  //  1) se l'utente ha scelto un "padre" (CDA_ART_COLLEGATO del piedino =
  //     CDA_ART_NODO della busta), mostro solo quella busta
  //  2) applico i facet selezionati solo se hanno senso per le buste
  //     (es. "DX" riguarda il piedino, non la busta che lo contiene)
  const contenitoriFiltrati = useMemo(() => {
    if (containers.length === 0) return [];
    let list = containers;
    if (selectedParent && selectedParent !== "__NONE__") {
      list = list.filter(r => r.CDA_ART_NODO === selectedParent);
    }
    const tokensInContainers = new Set<string>();
    for (const r of list) {
      for (const t of tokenizeForFacets(textForFacets(r))) tokensInContainers.add(t);
    }
    const applicable = new Set<string>();
    for (const f of selectedFacets) {
      if (tokensInContainers.has(f)) applicable.add(f);
    }
    return list.filter(r => rowMatchesFacets(r, applicable));
  }, [containers, selectedFacets, selectedParent]);

  const needParentStep = !isContainerSearch && !selectedParent && parentGroups.length > 1;
  const showFacetStep = !isContainerSearch && !needParentStep && currentStepGroup !== null;
  const showStep = needParentStep || showFacetStep;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Barra di ricerca — Articolo + Componente affiancati */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        {/* Campo Articolo (sinistra). Se lockato mostra chip; altrimenti
            input con autocomplete. */}
        <div className="relative sm:w-2/5">
          <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
            Articolo (opzionale)
          </label>
          {manualArticolo ? (
            <div className="flex items-center gap-2 rounded border border-purple-200 bg-purple-50 px-3 py-2">
              <span className="flex-1 truncate text-sm font-semibold text-purple-800">
                {manualArticolo.CDA_ART_ALIAS || manualArticolo.CDA_ART}
                <span className="ml-1 font-normal text-gray-600">— {manualArticolo.DES_ARTBASE}</span>
              </span>
              {prefetching && (
                <span className="text-xs text-gray-500 animate-pulse">caricando…</span>
              )}
              {!prefetching && distintaCache[manualArticolo.CDA_ART] && (
                <span className="text-xs text-green-700">✓ pronto</span>
              )}
              <button
                className="text-xs text-gray-500 hover:text-red-600"
                onClick={() => { setManualArticolo(null); setArticoloPicker(""); }}
                title="Rimuovi articolo"
              >
                ×
              </button>
            </div>
          ) : (
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Cerca articolo base (AMBRA, UNIKVER…) o lascia vuoto"
              value={articoloPicker}
              onChange={(e) => { setArticoloPicker(e.target.value); setShowArticoloSuggestions(true); }}
              onFocus={() => setShowArticoloSuggestions(true)}
              onBlur={() => setTimeout(() => setShowArticoloSuggestions(false), 150)}
            />
          )}

          {!manualArticolo && showArticoloSuggestions && articoloPicker.trim().length >= 2 && (
            <div className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
              {(() => {
                const q = normalize(articoloPicker).trim();
                const filtered = articoli.filter(a => {
                  const hay = normalize(
                    [a.CDA_ART, a.CDA_ART_ALIAS, a.DES_ARTBASE, a.DEV_ARTBASE, a.TXT_NOTA]
                      .filter(Boolean)
                      .join(" ")
                  );
                  return hay.includes(q);
                }).slice(0, 30);
                if (filtered.length === 0) {
                  return <div className="p-2 text-sm text-gray-500">Nessun articolo corrisponde.</div>;
                }
                return (
                  <ul className="divide-y divide-gray-100">
                    {filtered.map(a => (
                      <li key={a.CDA_ART}>
                        <button
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-purple-50"
                          onClick={() => {
                            setManualArticolo(a);
                            setArticoloPicker("");
                            setShowArticoloSuggestions(false);
                          }}
                        >
                          <span className="font-semibold text-purple-800">
                            {a.CDA_ART_ALIAS || a.CDA_ART}
                          </span>
                          <span className="ml-2 text-gray-700">{a.DES_ARTBASE}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          )}
        </div>

        {/* Campo Componente + bottone Trova */}
        <div className="flex-1">
          <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
            Componente / cosa cerchi
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder='Es.: "testate" oppure "piedino regolabile"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className="btn bp"
              onClick={handleSearch}
              disabled={loading || bootstrapping || !input.trim()}
            >
              {loading ? "…" : "Trova"}
            </button>
          </div>
        </div>
      </div>

      {bootstrapping && (
        <div className="mt-2 text-sm text-gray-500">
          Carico elenco articoli base e categorie…
        </div>
      )}

      {bootstrapErr && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {bootstrapErr}
        </div>
      )}

      {err && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {err}
        </div>
      )}

      {/* Tracing (nascosta di default, toggle con icona info) */}
      {trace && showTrace && (
        <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Tracciatura interpretazione
            </div>
            <button
              onClick={() => setShowTrace(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Nascondi tracciatura"
            >
              Nascondi
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-gray-700">Token letti:</span>
            {trace.originalTokens.map((t) => (
              <span key={t} className="rounded bg-gray-200 px-2 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-gray-700">Prodotto finito:</span>
            {trace.chosen ? (
              <>
                <span className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white">
                  {trace.chosen.articolo.CDA_ART_ALIAS || trace.chosen.articolo.CDA_ART} —{" "}
                  {trace.chosen.articolo.DES_ARTBASE}
                </span>
                <span className="text-xs text-gray-500">
                  (score {trace.chosen.score}, via {trace.chosen.matchedOn})
                </span>
              </>
            ) : (
              <span className="rounded border border-gray-300 px-2 py-0.5 text-xs">
                non identificato
              </span>
            )}
          </div>

          {trace.candidates.length > 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Altri candidati:</span>
              {trace.candidates.slice(1).map((c) => (
                <span
                  key={c.articolo.CDA_ART}
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700"
                >
                  {c.articolo.CDA_ART_ALIAS || c.articolo.CDA_ART} ({c.score})
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-gray-700">Descrizione componente:</span>
            {trace.desComponente ? (
              <span className="rounded bg-pink-600 px-2 py-0.5 text-xs text-white">
                {trace.desComponente}
              </span>
            ) : (
              <span className="rounded border border-gray-300 px-2 py-0.5 text-xs">
                nessuna
              </span>
            )}
            {trace.categoria && (
              <>
                <span className="ml-2 text-gray-700">Categoria:</span>
                <span className="rounded bg-sky-600 px-2 py-0.5 text-xs text-white">
                  {trace.categoria}
                </span>
              </>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            GET {trace.queryUrl}
            {trace.chosen && (
              <>
                {" "}→ solo righe con CDA_ART_BASE = {trace.chosen.articolo.CDA_ART}
                {trace.componentTokens.length > 0 && (
                  <> e filtro &quot;{trace.componentTokens.map(stemToken).join(" ")}&quot;</>
                )}
                {" "}(su {trace.totalBeforeFilter} righe totali)
              </>
            )}
          </div>
        </div>
      )}

      {/* Risultati */}
      {loading && <div className="mt-4 text-sm text-gray-500">Cerco…</div>}

      {/* Step 0 — scelta prodotto finito quando non è stato riconosciuto dal testo */}
      {!loading && pending && !results && (
        <ProductPicker
          pending={pending}
          articoli={articoli}
          input={pfPickerInput}
          onInputChange={setPfPickerInput}
          onPick={pickProduct}
        />
      )}

      {!loading && results && results.length === 0 && (
        <div className="mt-4 rounded border border-gray-200 bg-white p-4 text-sm">
          Nessun componente fisico trovato per questa ricerca.
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <>
          {/* Breadcrumb selezioni */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Selezioni:</span>
            {trace?.chosen && (
              <span className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white">
                {trace.chosen.articolo.CDA_ART_ALIAS || trace.chosen.articolo.CDA_ART}
              </span>
            )}
            {selectedParent && (
              <button
                className="group flex items-center gap-1 rounded bg-pink-600 px-2 py-0.5 text-xs text-white hover:bg-pink-700"
                onClick={() => { setSelectedParent(null); setSelectedFacets(new Set()); }}
                title={parentGroups.find(p => p.key === selectedParent)?.fullDesc ?? "Cambia contenitore"}
              >
                {parentGroups.find(p => p.key === selectedParent)?.label ?? selectedParent}
                <span className="opacity-60 group-hover:opacity-100">×</span>
              </button>
            )}
            {Array.from(selectedFacets).map(f => (
              <button
                key={f}
                className="group flex items-center gap-1 rounded bg-sky-600 px-2 py-0.5 text-xs text-white hover:bg-sky-700"
                onClick={() => clearFacet(f)}
                title="Rimuovi filtro"
              >
                {facetLabelMap[f] ?? f}
                <span className="opacity-60 group-hover:opacity-100">×</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setInput("");
                  setManualArticolo(null);
                  setArticoloPicker("");
                  resetSearchState();
                }}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                title="Pulisci articolo, componente e ricomincia"
              >
                ↻ Nuova ricerca
              </button>
              <button
                onClick={() => setShowTrace(v => !v)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-500 hover:border-purple-500 hover:text-purple-700"
                title={showTrace ? "Nascondi dettagli interpretazione" : "Mostra come ho interpretato la ricerca"}
                aria-label="Dettagli interpretazione"
              >
                i
              </button>
            </div>
          </div>

          {/* Primo step: scegli il contenitore/ramo della distinta.
              Si attiva quando i risultati stanno sotto padri diversi (es.
              buste diverse nella distinta del prodotto finito). */}
          {needParentStep && (
            <WizardStep
              title="Di quale tipo?"
              subtitle="Nella distinta trovo più contenitori per questo componente. Scegline uno."
            >
              {parentGroups.map(p => (
                <button
                  key={p.key}
                  className="rounded-lg border border-purple-200 bg-white px-4 py-2 text-left shadow-sm transition hover:border-purple-500 hover:shadow"
                  onClick={() => setSelectedParent(p.key)}
                >
                  <div className="font-semibold text-purple-700">{p.label}</div>
                  <div className="text-xs text-gray-500">
                    {p.count} {p.count === 1 ? "variante" : "varianti"}
                    {p.fullDesc && p.fullDesc !== p.label && (
                      <span className="ml-1">— {p.fullDesc}</span>
                    )}
                  </div>
                </button>
              ))}
            </WizardStep>
          )}

          {/* Step successivi: facet mutualmente esclusivi (colore, lato, ecc.) */}
          {showFacetStep && currentStepGroup && (
            <WizardStep
              title={groupTitle(currentStepGroup)}
              subtitle="Scegli uno per proseguire."
            >
              {currentStepGroup.map(f => {
                const count = countIfSelected(f.key);
                return (
                  <button
                    key={f.key}
                    className="rounded-lg border border-purple-200 bg-white px-4 py-2 text-left shadow-sm transition hover:border-purple-500 hover:shadow disabled:opacity-40"
                    onClick={() => toggleFacet(f.key, f.label)}
                    disabled={count === 0}
                  >
                    <div className="font-semibold text-purple-700">{f.label}</div>
                    <div className="text-xs text-gray-500">
                      {count} {count === 1 ? "variante" : "varianti"}
                    </div>
                  </button>
                );
              })}
            </WizardStep>
          )}

          {/* Risultato finale: solo quando non ci sono più step da chiedere */}
          {!showStep && (
            <>
              <ResultTable
                title={(() => {
                  const nArts = new Set(finalRows.map(r => r.CDA_ART_NODO)).size;
                  const label = nArts === 1 ? "articolo" : "articoli";
                  const totale = totalGiacenza > 0 ? ` — giacenza totale ${fmt.format(totalGiacenza)} pz` : "";
                  return `${nArts} ${label} trovat${nArts === 1 ? "o" : "i"}${totale}`;
                })()}
                rows={finalRows}
                accent="purple"
                expandableContent={isContainerSearch}
                distintaRaw={distintaRaw}
              />

              {!isContainerSearch && contenitoriFiltrati.length > 0 && (
                <ResultTable
                  title={`Buste accessori che lo includono (${contenitoriFiltrati.length})`}
                  subtitle="Se il cliente vuole la busta pre-assemblata invece dei singoli pezzi. Clicca 'Contenuto' per vedere cosa c'è dentro."
                  rows={contenitoriFiltrati}
                  accent="amber"
                  expandableContent={true}
                  distintaRaw={distintaRaw}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ResultTable({
  title,
  subtitle,
  rows,
  accent,
  expandableContent = true,
  distintaRaw = [],
}: {
  title: string;
  subtitle?: string;
  rows: ComponenteRow[];
  accent: "purple" | "amber";
  // se true, permetto di esplodere il "contenuto" della distinta
  // di ogni riga (usato per le buste accessori)
  expandableContent?: boolean;
  // dump completo della distinta del prodotto finito: da qui filtriamo
  // i figli di una busta tramite CDA_ART_COLLEGATO
  distintaRaw?: ComponenteRow[];
}) {
  const headerBg = accent === "amber" ? "bg-amber-50" : "bg-white";
  const borderTop = accent === "amber" ? "border-t-4 border-t-amber-500" : "border-t-4 border-t-purple-600";

  // Raggruppo per CDA_ART_NODO SOLO se ci sono abbastanza righe da giustificare
  // il collasso (>6). Altrimenti srotolo tutte le varianti come righe singole
  // per una lettura immediata: se il commerciale ha già filtrato tipo/colore,
  // vuole vedere i 2-3 progressivi rimanenti direttamente.
  const EXPAND_THRESHOLD = 6;
  const groups = useMemo(() => {
    if (rows.length <= EXPAND_THRESHOLD) {
      return rows.map((r, i) => ({
        reactKey: `${r.CDA_ART_NODO}-${r.PRG_ART_NODO ?? "x"}-${i}`,
        cda: r.CDA_ART_NODO,
        rs: [r],
      }));
    }
    const map = new Map<string, ComponenteRow[]>();
    for (const r of rows) {
      const key = r.CDA_ART_NODO;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([k, v]) => ({ reactKey: k, cda: k, rs: v }));
  }, [rows]);

  const [openVariants, setOpenVariants] = useState<Set<string>>(new Set());
  const [openContent, setOpenContent] = useState<Set<string>>(new Set());
  // Per ogni busta: lista dei suoi componenti con PRG, descrizione, giacenza V2
  const [contentRows, setContentRows] = useState<Record<string, VariantRow[] | { err: string }>>({});
  const [contentLoading, setContentLoading] = useState<Set<string>>(new Set());

  const toggleVariants = (key: string) => {
    setOpenVariants(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // key deve essere unica per riga (usa reactKey), così ogni variante della
  // stessa busta (es. 10BUSACCAMBRA /1 vs /11) apre/chiude in modo indipendente.
  const toggleContent = async (key: string, row: ComponenteRow, childrenRows: ComponenteRow[]) => {
    const already = openContent.has(key);
    setOpenContent(prev => {
      const next = new Set(prev);
      if (already) next.delete(key);
      else next.add(key);
      return next;
    });
    if (already) return;
    if (contentRows[key]) return; // già caricato

    setContentLoading(prev => new Set(prev).add(key));

    try {
      // Strategia: per ogni componente figlio (CDA_ART_NODO nel dump con
      // CDA_ART_COLLEGATO=busta) chiedo al backend i suoi progressivi specifici
      // usati in quella distinta. Così evito che l'esplosione della
      // sub-distinta mischi componenti di altre buste/kit (es. piedini
      // OCCULTO quando stiamo nella busta REGOLABILE).
      let variants: VariantRow[] = [];
      const uniqueCdas = Array.from(new Set(childrenRows.map(c => c.CDA_ART_NODO)));
      // Mappa child → prgDiba della sua riga (spesso uguale per tutti)
      const prgDibaByCda = new Map<string, number>();
      for (const c of childrenRows) {
        const p = c.PRG_DIBA_COLLEGATO ?? c.PRG_DIBA;
        if (p) prgDibaByCda.set(c.CDA_ART_NODO, p);
      }

      // Se la busta ha un PRG specifico (es. colore), passo sia cda_art che
      // prg_art della busta: il backend filtra la sub-distinta per quella
      // variante specifica (es. busta BIANCA → solo piedini BIANCHI).
      const bustaCda = row.CDA_ART_NODO;
      const bustaPrg = row.PRG_ART_NODO;

      const calls = await Promise.all(
        uniqueCdas.map(childCda => {
          const params = new URLSearchParams();
          const p = prgDibaByCda.get(childCda);
          if (p) params.set("prg_diba", String(p));
          params.set("cda_art_nodo", childCda);
          if (bustaCda) params.set("cda_art", bustaCda);
          if (bustaPrg != null) params.set("prg_art", String(bustaPrg));
          return fetchJson<VariantRow[]>(
            `/api/ricerca-smart/dettagli?${params.toString()}`
          ).catch(() => [] as VariantRow[]);
        })
      );
      variants = calls.flat();

      // Applico giacenze V2 sui progressivi ottenuti
      const cdaArts = Array.from(new Set(variants.map(v => v.CDA_ART_NODO)));
      if (cdaArts.length > 0) {
        try {
          const res = await fetch("/api/ricerca-smart/giacenze-v2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cdaArts }),
          });
          if (res.ok) {
            const { giacenze } = (await res.json()) as { giacenze: Record<string, number | null> };
            for (const v of variants) {
              const mapKey = `${v.CDA_ART_NODO}|${v.PRG_ART_NODO ?? ""}`;
              if (Object.prototype.hasOwnProperty.call(giacenze, mapKey)) {
                v.QTA_GIACENZA = giacenze[mapKey];
              }
            }
          }
        } catch (e) {
          console.warn("override V2 nel contenuto busta", e);
        }
      }

      setContentRows(s => ({ ...s, [key]: variants }));
    } catch (e) {
      console.warn("contenuto busta", e);
      setContentRows(s => ({ ...s, [key]: { err: "Errore nel caricamento" } }));
    } finally {
      setContentLoading(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Indice rapido: codice busta → lista figli (righe con CDA_ART_COLLEGATO = busta)
  const contentIndex = useMemo(() => {
    const m = new Map<string, ComponenteRow[]>();
    for (const r of distintaRaw) {
      if (r.CDA_ART_COLLEGATO) {
        const list = m.get(r.CDA_ART_COLLEGATO) ?? [];
        list.push(r);
        m.set(r.CDA_ART_COLLEGATO, list);
      }
    }
    // Dedupplico per CDA_ART_NODO all'interno di ogni busta
    for (const [k, list] of m) {
      const seen = new Set<string>();
      const unique: ComponenteRow[] = [];
      for (const r of list) {
        if (!seen.has(r.CDA_ART_NODO)) {
          seen.add(r.CDA_ART_NODO);
          unique.push(r);
        }
      }
      m.set(k, unique);
    }
    return m;
  }, [distintaRaw]);

  return (
    <div className={`mt-4 overflow-hidden rounded border border-gray-200 bg-white ${borderTop}`}>
      <div className={`border-b border-gray-200 p-3 ${headerBg}`}>
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-gray-600">{subtitle}</div>}
      </div>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Codice</th>
                <th className="px-3 py-2 font-medium">Descrizione</th>
                <th className="px-3 py-2 text-right font-medium">Giacenza</th>
                <th className="px-3 py-2 text-right font-medium">U.M.</th>
                <th className="px-3 py-2 text-right font-medium w-24"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ reactKey, cda, rs }) => {
                const first = rs[0];
                const n = rs.length;
                const baseDescr =
                  (first as { DES_ARTBASE?: string | null }).DES_ARTBASE ||
                  first.DES_ARTICOLO ||
                  first.DES_COMPONENTE ||
                  "—";
                // Se 1 sola variante: mostro giacenza e descrizione variante
                // Se N varianti: nascondo giacenza e mostro "N progressivi"
                const singleRow = n === 1 ? first : null;
                const descr = singleRow
                  ? (singleRow.DEV_ARTICOLO || singleRow.DES_ARTICOLO || baseDescr)
                  : baseDescr;
                const g = singleRow?.QTA_GIACENZA ?? null;
                const giacColor = g != null && g > 0 ? "text-green-700" : "text-red-600";
                const variantsOpen = openVariants.has(cda);
                const contentOpen = openContent.has(reactKey);

                const rowClickable = expandableContent;
                return (
                  <Fragment key={reactKey}>
                    <tr
                      className={`border-t border-gray-100 hover:bg-gray-50 ${rowClickable ? "cursor-pointer" : ""}`}
                      onClick={rowClickable ? () => {
                        const children = contentIndex.get(cda) ?? [];
                        toggleContent(reactKey, first, children);
                      } : undefined}
                    >
                      <td className="px-3 py-2">
                        <span className="font-semibold text-purple-700">
                          {cda}
                        </span>
                        {singleRow?.PRG_ART_NODO != null && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                            /{singleRow.PRG_ART_NODO}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{descr}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${giacColor}`}>
                        {singleRow
                          ? (g == null ? "—" : fmt.format(g))
                          : (
                            <button
                              className="text-sm font-medium text-purple-700 hover:underline"
                              onClick={(e) => { e.stopPropagation(); toggleVariants(cda); }}
                            >
                              {n} progressivi {variantsOpen ? "▲" : "▼"}
                            </button>
                          )
                        }
                      </td>
                      <td className="px-3 py-2 text-right">{first.CDA_UNIMIS_PRI ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">
                        {expandableContent && (contentOpen ? "▲" : "clicca per vedere ▼")}
                      </td>
                    </tr>

                    {/* Espansione varianti (progressivi diversi) */}
                    {!singleRow && variantsOpen && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 px-3 py-2">
                          <table className="w-full text-xs">
                            <thead className="text-left text-gray-500">
                              <tr>
                                <th className="py-1">PRG</th>
                                <th className="py-1">Descrizione</th>
                                <th className="py-1 text-right">Giacenza</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rs.map((v, i) => {
                                const vg = v.QTA_GIACENZA;
                                const vColor = vg != null && vg > 0 ? "text-green-700" : "text-red-600";
                                return (
                                  <tr key={`${cda}-${v.PRG_ART_NODO ?? i}`} className="border-t border-gray-200">
                                    <td className="py-1 font-semibold text-gray-700">{v.PRG_ART_NODO ?? "—"}</td>
                                    <td className="py-1">{v.DEV_ARTICOLO || v.DES_ARTICOLO || "—"}</td>
                                    <td className={`py-1 text-right font-semibold ${vColor}`}>
                                      {vg == null ? "—" : fmt.format(vg)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}

                    {/* Espansione contenuto busta: mostro ogni progressivo
                        come riga separata (codice + PRG + descrizione + giacenza V2) */}
                    {expandableContent && contentOpen && (() => {
                      const state = contentRows[reactKey];
                      const loading = contentLoading.has(reactKey);
                      const variants = Array.isArray(state) ? state : [];
                      const errMsg = state && !Array.isArray(state) ? state.err : null;
                      return (
                        <tr>
                          <td colSpan={5} className="bg-amber-50 px-3 py-3">
                            <div className="mb-2 text-xs uppercase tracking-wide text-amber-900">
                              Contenuto busta {cda}
                              {!loading && variants.length > 0 && (
                                <span className="ml-2 normal-case text-gray-600">
                                  ({variants.length} progressivi)
                                </span>
                              )}
                            </div>
                            {loading && <div className="text-xs text-gray-500">Carico…</div>}
                            {errMsg && <div className="text-xs text-red-600">{errMsg}</div>}
                            {!loading && !errMsg && variants.length === 0 && (
                              <div className="text-xs text-gray-500">
                                Nessun progressivo trovato.
                              </div>
                            )}
                            {!loading && variants.length > 0 && (
                              <table className="w-full text-xs">
                                <thead className="text-left text-gray-500">
                                  <tr>
                                    <th className="py-1">Codice</th>
                                    <th className="py-1">PRG</th>
                                    <th className="py-1">Descrizione</th>
                                    <th className="py-1 text-right">Giacenza</th>
                                    <th className="py-1 text-right">U.M.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variants.map((v, i) => {
                                    const vg = v.QTA_GIACENZA;
                                    const vColor = vg != null && vg > 0 ? "text-green-700" : "text-red-600";
                                    const desc = v.DEV_ARTICOLO || v.DES_ARTICOLO || "—";
                                    return (
                                      <tr key={`${v.CDA_ART_NODO}-${v.PRG_ART_NODO ?? i}-${i}`} className="border-t border-amber-200">
                                        <td className="py-1 font-semibold text-purple-700">{v.CDA_ART_NODO}</td>
                                        <td className="py-1 text-gray-700">/{v.PRG_ART_NODO ?? "—"}</td>
                                        <td className="py-1">{desc}</td>
                                        <td className={`py-1 text-right font-semibold ${vColor}`}>
                                          {vg == null ? "—" : fmt.format(vg)}
                                        </td>
                                        <td className="py-1 text-right">{v.CDA_UNIMIS_PRI ?? "—"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WizardStep({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      {subtitle && <div className="mt-0.5 text-sm text-gray-600">{subtitle}</div>}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FacetPanel({
  facets,
  selected,
  onToggle,
  facetCandidate,
}: {
  facets: { num: Facet[]; text: Facet[] };
  selected: Set<string>;
  onToggle: (key: string) => void;
  facetCandidate: ((key: string) => number) | null;
}) {
  const renderGroup = (title: string, list: Facet[], colorClass: string) => {
    if (list.length === 0) return null;
    return (
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">{title}</div>
        <div className="flex flex-wrap gap-2">
          {list.map(f => {
            const active = selected.has(f.key);
            const count = facetCandidate ? facetCandidate(f.key) : f.count;
            return (
              <button
                key={f.key}
                onClick={() => onToggle(f.key)}
                className={[
                  "rounded-full border px-3 py-1 text-xs transition",
                  active
                    ? `${colorClass} text-white`
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-500",
                ].join(" ")}
                disabled={count === 0 && !active}
                title={active ? "Clic per rimuovere" : `${count} risultati con questo filtro`}
              >
                <span className="font-semibold">{f.key}</span>
                <span className="ml-1 opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-gray-800">
        Restringi la ricerca cliccando sugli attributi che ti servono
      </div>
      <div className="mt-3 space-y-3">
        {renderGroup("Misure", facets.num, "border-emerald-600 bg-emerald-600")}
        {renderGroup("Altre proprietà", facets.text, "border-sky-600 bg-sky-600")}
      </div>
    </div>
  );
}

function ProductPicker({
  pending,
  articoli,
  input,
  onInputChange,
  onPick,
}: {
  pending: {
    componentTokens: string[];
    candidates: ArticoloMatch[];
    suggested: ArticoloBase[];
  };
  articoli: ArticoloBase[];
  input: string;
  onInputChange: (v: string) => void;
  onPick: (a: ArticoloBase) => void;
}) {
  const componentLabel = pending.componentTokens.join(" ") || "componente";

  const filtered = useMemo(() => {
    const q = normalize(input).trim();
    const list = q
      ? articoli.filter(a => {
          const hay = normalize(
            [a.CDA_ART, a.CDA_ART_ALIAS, a.DES_ARTBASE, a.DEV_ARTBASE, a.TXT_NOTA]
              .filter(Boolean)
              .join(" ")
          );
          return hay.includes(q);
        })
      : articoli;
    return list.slice(0, 40);
  }, [articoli, input]);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-base font-semibold text-gray-900">
        Per quale articolo cerchi &quot;{componentLabel.toLowerCase()}&quot;?
      </div>
      <div className="mt-0.5 text-sm text-gray-600">
        Il componente va sempre letto dentro una distinta base. Scegli il prodotto finito per
        scremare i componenti giusti.
      </div>

      <div className="mt-4">
        <input
          type="text"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Cerca un prodotto finito (codice, alias, descrizione…)"
          value={input}
          onChange={e => onInputChange(e.target.value)}
          autoFocus
        />
        <div className="mt-2 max-h-80 overflow-y-auto rounded border border-gray-200">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Nessun articolo corrisponde.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map(a => (
                <li key={a.CDA_ART}>
                  <button
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-purple-50"
                    onClick={() => onPick(a)}
                  >
                    <span className="font-semibold text-purple-800">
                      {a.CDA_ART_ALIAS || a.CDA_ART}
                    </span>
                    <span className="ml-2 text-gray-700">{a.DES_ARTBASE}</span>
                    {a.CDA_ART_ALIAS && a.CDA_ART_ALIAS !== a.CDA_ART && (
                      <span className="ml-2 text-xs text-gray-500">({a.CDA_ART})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {input.trim() === "" && articoli.length > filtered.length && (
          <div className="mt-1 text-xs text-gray-500">
            {articoli.length} articoli totali — scrivi per filtrare.
          </div>
        )}
      </div>
    </div>
  );
}
