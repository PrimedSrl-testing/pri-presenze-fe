// client/src/data/constants.js
// ─────────────────────────────────────────────────────────────
// Costanti di configurazione: reparti, causali, turni, aziende
// ─────────────────────────────────────────────────────────────

export const AZIENDE = [
  { id: 'primed',     nome: 'PRIMED S.r.l.',     colore: '#3b82f6' },
  { id: 'noflystore', nome: 'NOFLYSTORE S.r.l.', colore: '#10b981' },
];

export const DEPARTMENTS = [
  { id: 'AVVOLGENTI',       nome: 'Avvolgenti',        col: '#3b82f6', azienda: 'primed' },
  { id: 'ANTE',             nome: 'Ante',              col: '#0ea5e9', azienda: 'primed' },
  { id: 'IMBALLI',          nome: 'Imballi',           col: '#ec4899', azienda: 'primed' },
  { id: 'PLISSETTATE',      nome: 'Plissettate',       col: '#a855f7', azienda: 'primed' },
  { id: 'MAGAZZINO',        nome: 'Magazzino',         col: '#6b7280', azienda: 'primed' },
  { id: 'AUTISTI',          nome: 'Autisti',           col: '#10b981', azienda: 'primed' },
  { id: 'DIVA/SWITCH',      nome: 'Diva / Switch',     col: '#f97316', azienda: 'primed' },
  { id: 'LOGISTICA',        nome: 'Logistica',         col: '#84cc16', azienda: 'primed' },
  { id: 'RIPARAZIONI DIVA', nome: 'Riparazioni Diva',  col: '#d97706', azienda: 'primed' },
  { id: 'COMMERCIALE ITALIA',nome:'Commerciale Italia',col: '#3b82f6', azienda: 'primed' },
  { id: 'AMMINISTRAZIONE',  nome: 'Amministrazione',   col: '#6366f1', azienda: 'primed' },
  { id: 'ALTRO',            nome: 'Altro / Uffici',    col: '#94a3b8', azienda: 'primed' },
];

export const CAUSALI_ASSENZA = [
  { cod: 'F',   nome: 'Ferie',                   colore: '#3b82f6', richiede_doc: false },
  { cod: 'ML',  nome: 'Malattia',                colore: '#ef4444', richiede_doc: true  },
  { cod: 'R',   nome: 'ROL / Permesso',          colore: '#8b5cf6', richiede_doc: false },
  { cod: 'BOA', nome: 'Banca ore assenza',        colore: '#f59e0b', richiede_doc: false },
  { cod: 'BOP', nome: 'Banca ore presenza',       colore: '#10b981', richiede_doc: false },
  { cod: 'IN',  nome: 'Infortunio',              colore: '#dc2626', richiede_doc: true  },
  { cod: 'MAT', nome: 'Maternità/Paternità',     colore: '#ec4899', richiede_doc: true  },
  { cod: 'ASP', nome: 'Aspettativa',             colore: '#6b7280', richiede_doc: true  },
  { cod: 'STR', nome: 'Straordinario',           colore: '#f97316', richiede_doc: false },
];

export const TURNI_DB = [
  { id: 't1', nome: 'Turno mattina',    ora_inizio: '06:00', ora_fine: '14:00', ore: 8,   giorni: [1,2,3,4,5], colore: '#3b82f6' },
  { id: 't2', nome: 'Turno pomeriggio', ora_inizio: '14:00', ora_fine: '22:00', ore: 8,   giorni: [1,2,3,4,5], colore: '#8b5cf6' },
  { id: 't3', nome: 'Giornaliero std',  ora_inizio: '08:00', ora_fine: '17:00', ore: 8,   giorni: [1,2,3,4,5], colore: '#10b981' },
  { id: 't4', nome: 'Part-time mattina',ora_inizio: '08:00', ora_fine: '12:00', ore: 4,   giorni: [1,2,3,4,5], colore: '#f59e0b' },
  { id: 't5', nome: 'Sabato mattina',   ora_inizio: '08:00', ora_fine: '13:00', ore: 5,   giorni: [6],          colore: '#ec4899' },
  { id: 't6', nome: 'Straordinario',    ora_inizio: null,    ora_fine: null,    ore: null, giorni: [],           colore: '#ef4444' },
];

/** Permessi di default per ruolo */
export const DEFAULT_PERMISSIONS = {
  dip: {
    vede_propria_scheda: true,
    richiede_ferie: true,
    vede_cedolino: true,
  },
  mgr: {
    vede_team: true,
    approva_ferie: true,
    vede_presenze_team: true,
    segnala_anomalie: true,
  },
  hr: {
    gestisce_dipendenti: true,
    modifica_contratti: true,
    chiude_mese: true,
    export_paghe: true,
    vede_tutto: true,
  },
  dir: {
    vede_dashboard_dir: true,
    vede_kpi: true,
    vede_costi: true,
  },
};

/** Stato mesi */
export const MESI_STATO_DEFAULT = {
  '2026-01': { stato: 'paghe_inviato', chiuso_da: 'Noemi Attanasio (HR)', chiuso_il: '01/02/2026 09:00' },
  '2026-02': { stato: 'chiuso',        chiuso_da: 'Noemi Attanasio (HR)', chiuso_il: '03/03/2026 10:15' },
  '2026-03': { stato: 'aperto',        chiuso_da: null,                   chiuso_il: null                },
};
