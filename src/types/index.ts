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

// ─── Configurazione Dipendente (pausa pranzo, straordinari, banca ore) ───────

export interface DipConfig {
  id: number;
  dip_id: number;
  // Dati anagrafici
  codice_fiscale: string | null;
  email: string | null;
  telefono: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  genere: "M" | "F" | null;
  nazionalita: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  iban: string | null;
  contatto_emergenza: string | null;
  contatto_emergenza_tel: string | null;
  // PEC
  pec: string | null;
  // Documenti
  doc_carta_identita: boolean;
  doc_codice_fiscale: boolean;
  doc_c2_storico: boolean;
  doc_permesso_soggiorno: boolean;
  doc_ci_file: string | null;
  doc_cf_file: string | null;
  doc_c2_file: string | null;
  doc_ps_file: string | null;
  // Rapporto lavorativo
  tipo_rapporto: "diretto" | "somministrato" | null;
  // Pausa pranzo (multi-livello)
  regole_pausa: RegolaPausa[] | null; // null = usa i campi legacy sotto
  pausa_minuti: number;       // Default 30 (legacy)
  pausa_soglia_ore: number;   // Ore minime prima di scalare pausa (default 8)
  pausa_auto: boolean;        // Se true, la pausa si scala automaticamente
  // Banca ore flags (indipendenti)
  flg_bop: boolean;           // Banca Ore Presenze
  flg_boa: boolean;           // Banca Ore Assenza
  flg_bos: boolean;           // Banca Ore Straordinario
  // Assunzione
  tipo_assunzione: "stagionale" | "nuovo" | null;
  stagionale_gia_censito: boolean;
  // Kronos placeholder
  kronos_badge: string | null;
  kronos_attivo: boolean;
}

// ─── Contratti Ciclici ───────────────────────────────────────────────────────

export interface ContrattoCiclico {
  id: number;
  dip_id: number;
  periodo1_da_mese: number;
  periodo1_da_giorno: number;
  periodo1_ore_sett: number;
  periodo1_contratto_id: number | null;
  periodo2_da_mese: number;
  periodo2_da_giorno: number;
  periodo2_ore_sett: number;
  periodo2_contratto_id: number | null;
  override_data_switch1: string | null;
  override_data_switch2: string | null;
  anno_riferimento: number | null;
  attivo: boolean;
  note: string | null;
}

// ─── Banca Ore Settimanale ───────────────────────────────────────────────────

export interface BancaOreSettimana {
  id: number;
  dip_id: number;
  anno: number;
  settimana: number;
  ore_contrattuali: number;
  ore_lavorate: number;
  ore_supplementari: number;
  ore_straordinario_pagabile: number;
  ore_bob: number;
  ore_boa: number;
  ore_bop: number;
  ore_bos: number;
  calcolato_il: string;
  note: string | null;
}

// ─── Workflow Assunzioni ─────────────────────────────────────────────────────

export type TipoAssunzione = "stagionale" | "nuovo";
export type StatoAssunzione = "bozza" | "in_corso" | "completata" | "annullata";

export interface Assunzione {
  id: number;
  tipo: TipoAssunzione;
  stato: StatoAssunzione;
  nome: string;
  cognome: string;
  codice_fiscale: string | null;
  email: string | null;
  telefono: string | null;
  data_assunzione: string | null;
  data_fine_contratto: string | null;
  id_contratto: number | null;
  id_reparto: number | null;
  ore_settimanali: number | null;
  tipo_rapporto: "diretto" | "somministrato" | null;
  causale_contratto: string | null;
  mesi_residui_24: number | null;
  superato_12_mesi: boolean;
  kronos_riattivato: boolean;
  badge_assegnato: boolean;
  orario_configurato: boolean;
  doc_carta_identita: boolean;
  doc_codice_fiscale: boolean;
  doc_c2_storico: boolean;
  visita_medica_richiesta: boolean;
  visita_medica_effettuata: boolean;
  formazione_richiesta: boolean;
  formazione_effettuata: boolean;
  scheda_tecsam_generata: boolean;
  scheda_tecsam_inviata: boolean;
  sync_gestionale: boolean;
  sync_kronos: boolean;
  sync_anagrafica: boolean;
  dip_id: number | null;
  creato_da: string | null;
  note: string | null;
  data_ins: string;
  data_mod: string | null;
  des_reparto?: string;
  des_contratto?: string;
}

// ─── Presenze giornaliere ────────────────────────────────────────────────────

export interface PresenzaGiorno {
  id: number;
  dip_id: number;
  data: string;
  in1: string | null;
  out1: string | null;
  in2: string | null;
  out2: string | null;
  in3: string | null;
  out3: string | null;
  ore_teoriche: number;
  ore_lavorate: number;
  ore_pausa: number;
  ore_nette: number;
  stato: StatoGiorno;
  nota: string | null;
}

// ─── Dipendente DB (dal DB reale) ────────────────────────────────────────────

export interface DipendenteDB {
  id: number;
  matricola: string;
  nome: string;
  des_reparto: string;
  des_contratto: string;
  data_inizio: string;
  data_fine: string | null;
  des_programma: string;
  ore_settimanali: number;
  id_reparto: number;
  id_contratto: number;
  id_mansione: number;
  id_programma: number;
  config?: DipConfig | null;
  contratto_ciclico?: ContrattoCiclico | null;
}

// ─── Export Consulente ───────────────────────────────────────────────────────

export interface ExportConsulente {
  matricola: string;
  nome: string;
  settimana: number;
  anno: number;
  ore_ordinarie: number;
  ore_supplementari: number;
  ore_straordinario: number;
}

// ─── Pipeline Regole Ore ────────────────────────────────────────────────────

// ─── Storico Contratti ───────────────────────────────────────────────────

export interface StoricoContratto {
  id: number;
  dip_id: number;
  data_inizio: string;
  data_fine: string | null;
  tipo_contratto: string | null;
  ore_settimanali: number | null;
  tipo_rapporto: "diretto" | "somministrato" | null;
  note: string | null;
  attivo: boolean;
}

// ─── Profili Parametri (filtri + auto-applicazione) ─────────────────────

export interface ProfiloParametri {
  id: number;
  nome: string;
  filtro_tipo_contratto: string | null;
  filtro_tipo_rapporto: "diretto" | "somministrato" | null;
  filtro_ore_da: number | null;
  filtro_ore_a: number | null;
  regole_pausa: RegolaPausa[] | null;
  pausa_minuti: number;
  pausa_soglia_ore: number;
  pausa_auto: boolean;
  eccesso_pipeline: StepEccesso[];
  deficit_pipeline: StepDeficit[];
  straordinario_max_sett: number;
  straordinario_max_giorno: number;
  straordinario_priorita_sabato: boolean;
  priorita: number;
  attivo: boolean;
  note: string | null;
}

// ─── Saldi Dipendente ────────────────────────────────────────────────────

export interface SaldoDipendente {
  id: number;
  dip_id: number;
  anno: number;
  mese: number;
  // Ferie
  ferie_ap: number;         // Anno precedente
  ferie_maturate: number;   // Maturate nell'anno
  ferie_usate: number;      // Godute
  ferie_residuo: number;    // Residuo
  // ROL
  rol_ap: number;
  rol_maturato: number;
  rol_usato: number;
  rol_residuo: number;
  // Banca Ore
  banca_ore_ap: number;
  banca_ore: number;        // Maturata
  banca_ore_usata: number;  // Goduta
  banca_ore_residuo: number;
  // BOP (gestito internamente)
  bop: number;
  bop_usato: number;
  note: string | null;
}

// ─── Regole Pausa Pranzo Multi-Livello ───────────────────────────────────

export interface RegolaPausa {
  ore_da: number;        // turno da X ore
  ore_a: number | null;  // turno fino a Y ore (null = illimitato)
  pausa_minuti: number;  // minuti di pausa
  dopo_ore: number;      // pausa dopo N ore di lavoro
}

// ─── Pipeline Regole Ore ────────────────────────────────────────────────────

export type DestinazioneEccesso = "boa" | "straordinario" | "bop" | "bos";
export type FonteDeficit = "ferie" | "rol" | "boa" | "bop";
export type ApplicazioneDeficit = "intera" | "parziale";

export interface StepEccesso {
  dest: DestinazioneEccesso;
  max_ore: number | null; // null = illimitato (bucket finale)
}

export interface StepDeficit {
  source: FonteDeficit;
  per: ApplicazioneDeficit; // intera = giornata intera, parziale = ore
}

export interface RegoleGlobali {
  id: number;
  nome: string;
  ft_eccesso_pipeline: StepEccesso[];
  pt_eccesso_pipeline: StepEccesso[];
  pt_supplementari_attivo: boolean;
  straordinario_max_sett: number;
  straordinario_max_giorno: number;
  straordinario_priorita_sabato: boolean;
  deficit_pipeline: StepDeficit[];
  pausa_minuti_default: number;
  pausa_soglia_ore_default: number;
  pausa_auto_default: boolean;
  attivo: boolean;
}

export interface DipRegole {
  id: number;
  dip_id: number;
  ft_eccesso_pipeline: StepEccesso[] | null;
  pt_eccesso_pipeline: StepEccesso[] | null;
  pt_supplementari_attivo: boolean | null;
  straordinario_max_sett: number | null;
  straordinario_max_giorno: number | null;
  straordinario_priorita_sabato: boolean | null;
  deficit_pipeline: StepDeficit[] | null;
  note: string | null;
}

export interface RegoleEffettive {
  ft_eccesso_pipeline: StepEccesso[];
  pt_eccesso_pipeline: StepEccesso[];
  pt_supplementari_attivo: boolean;
  straordinario_max_sett: number;
  straordinario_max_giorno: number;
  straordinario_priorita_sabato: boolean;
  deficit_pipeline: StepDeficit[];
}

// ─── Template Orari Multi-Settimanali ───────────────────────────────────────

export interface OrarioTemplate {
  id: number;
  nome: string;
  num_settimane: number;
  attivo: boolean;
  note: string | null;
  giorni?: OrarioTemplateGiorno[];
}

export interface OrarioTemplateGiorno {
  id: number;
  template_id: number;
  settimana_num: number;
  giorno_settimana: number; // 1=Lun, 2=Mar, ..., 6=Sab, 7=Dom
  ore_teoriche: number;
  orario_inizio: string | null;
  orario_fine: string | null;
}

export interface DipOrario {
  id: number;
  dip_id: number;
  template_id: number;
  data_inizio_ciclo: string;
  attivo: boolean;
  note: string | null;
  template?: OrarioTemplate;
}

// ─── Tecsam ─────────────────────────────────────────────────────────────────

export type TipoTecsam = "visita_medica" | "formazione" | "altro";
export type StatoTecsam = "da_programmare" | "programmata" | "effettuata" | "scaduta";

export interface TecsamRecord {
  id: number;
  dip_id: number;
  tipo: TipoTecsam;
  descrizione: string;
  data_scadenza: string | null;
  data_prossima: string | null;
  data_effettuata: string | null;
  stato: StatoTecsam;
  esito: string | null;
  note: string | null;
  creato_da: string | null;
  dip_nome?: string;
  matricola?: string;
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
