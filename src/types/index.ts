// ─── Aziende ─────────────────────────────────────────────────────────────────

export interface Azienda {
  id: string;
  nome: string;
  sede: string;
  piva: string;
  colore: string;
}

// ─── Collaboratori / Dipendenti ───────────────────────────────────────────────

export type TipoCollaborazione =
  | "dipendente"
  | "libero_prof"
  | "consulente"
  | "stagista"
  | "apprendista"
  | "somministrato";

export type TipoContratto = "Indeterminato" | "Determinato";

export type RuoloUtente = "hr" | "amgr" | "mgr" | "dip";

export type StatusPresenza = "IN" | "OUT";

export interface AssegnazioneDipartimento {
  dept: string;
  dal: string; // ISO date
  al: string | null; // null = ancora attivo
}

export interface Collaboratore {
  id: string;
  fn: string; // first name
  ln: string; // last name
  full: string;
  ini: string; // initials
  email: string;
  phone: string;
  cf: string;
  societa: string;
  tipo: TipoCollaborazione;
  dept: string;
  co: string; // azienda id
  mansione: string;
  ini_contratto: string;
  fin_contratto: string | null;
  compenso: string;
  note: string;
  attivo: boolean;
  role: RuoloUtente;
  mat: string; // matricola
  col: string; // avatar color
  status: StatusPresenza;
  assignments: AssegnazioneDipartimento[];
  tempo: TipoContratto;
  hours?: number;
  anom?: number;
  extra?: number;
  contract?: string;
}

// ─── Dipartimenti ─────────────────────────────────────────────────────────────

export interface DeptManagerConfig {
  managers: string[]; // matricole
  area_managers: string[];
  resp_principale: string;
  am_risponde_a: string[];
}

export type DeptManagersMap = Record<string, DeptManagerConfig>;

// ─── Causali ──────────────────────────────────────────────────────────────────

export type TipoDurata =
  | "ore_giornaliere"
  | "periodo"
  | "giorni"
  | "ore_libere"
  | "giornata_intera";

export type ProtezioneAssenza = "protetta" | "compensabile" | "neutra";

export interface Causale {
  id: string;
  nome: string;
  tipo_durata: TipoDurata;
  chi_inserisce: RuoloUtente[];
  approvazione_hr: boolean;
  protezione: ProtezioneAssenza;
  colore: string;
  icona: string;
  note: string;
  visibile_dipendente: boolean;
  attiva: boolean;
}

// ─── Timbrature / Timesheet ───────────────────────────────────────────────────

export type StatoGiorno = "ok" | "anomalia" | "assenza" | "festivo" | "weekend";

export interface Timbratura {
  ts: string; // ISO datetime
  tipo: "IN" | "OUT";
}

export interface GiornoTimesheet {
  date: string; // ISO date
  timbrature: Timbratura[];
  oreTeoriche: number;
  oreLavorate: number;
  stato: StatoGiorno;
  nota?: string;
}

export interface TimesheetMese {
  empId: string;
  anno: number;
  mese: number;
  giorni: GiornoTimesheet[];
  totaleTeoriche: number;
  totaleLavorate: number;
  saldo: number;
}

// ─── Anomalie ─────────────────────────────────────────────────────────────────

export type GravitaAnomalia = "alta" | "media" | "bassa";
export type StatoAnomalia = "aperta" | "risolta" | "in_lavorazione";
export type TipoAnomalia =
  | "timbratura_mancante"
  | "orario_insufficiente"
  | "assenza_ingiustificata"
  | "ritardo"
  | "uscita_anticipata";

export interface Anomalia {
  id: string;
  empId: string;
  date: string;
  tipo: TipoAnomalia;
  gravita: GravitaAnomalia;
  stato: StatoAnomalia;
  descrizione: string;
  risoluzione?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ─── Richieste Ferie/Permessi ─────────────────────────────────────────────────

export type StatoRichiesta = "pending" | "approvata" | "rifiutata";

export interface Richiesta {
  id: string;
  empId: string;
  causaleId: string;
  dal: string;
  al: string;
  ore?: number;
  note: string;
  stato: StatoRichiesta;
  createdAt: string;
  notaMgr?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "ok" | "err" | "info";
}
