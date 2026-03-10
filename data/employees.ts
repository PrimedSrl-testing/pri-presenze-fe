// src/data/employees.ts

export interface Employee {
  id: string;
  mat: string;
  fn: string;
  ln: string;
  full: string;
  ini: string;
  role: 'dip' | 'mgr';
  dept: string;
  ruolo: string;
  co: string;
  col: string;
  contract: string;
  tempo: string;
  hours: number;
  status: 'IN' | 'OUT';
  active: boolean;
  hire: string;
  fin_contratto?: string;
}

export const EMPLOYEES: Employee[] = [
  // ── AVVOLGENTI ──────────────────────────────────────────
  { id:'e1',   mat:'1',   fn:'Mario',     ln:'Russo',          full:'Mario Russo',          ini:'MR', role:'mgr', dept:'AVVOLGENTI',       ruolo:'CAPO REPARTO',         co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2020-01-01' },
  { id:'e34',  mat:'34',  fn:'Luca',      ln:'De Palma',       full:'Luca De Palma',        ini:'LD', role:'dip', dept:'AVVOLGENTI',       ruolo:'OPERAIO',              co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-03-15' },
  { id:'e72',  mat:'72',  fn:'Leonardo',  ln:'Colucci',        full:'Leonardo Colucci',     ini:'LC', role:'mgr', dept:'AVVOLGENTI',       ruolo:'CAPO REPARTO',         co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2019-06-01' },
  { id:'e854', mat:'854', fn:'Valerio',   ln:'Petrarulo',      full:'Valerio Petrarulo',    ini:'PO', role:'dip', dept:'AVVOLGENTI',       ruolo:'OPERAIO',              co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2021-09-01' },
  { id:'e872', mat:'872', fn:'Giulia',    ln:'Leporale',       full:'Giulia Leporale',      ini:'LG', role:'dip', dept:'AVVOLGENTI',       ruolo:'OPERAIO',              co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2023-01-09' },
  { id:'e922', mat:'922', fn:'Daniela',   ln:'Mirto',          full:'Daniela Mirto',        ini:'MD', role:'dip', dept:'AVVOLGENTI',       ruolo:'OPERAIO',              co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-05-10' },
  { id:'e949', mat:'949', fn:'Luciana',   ln:'Anastasia',      full:'Luciana Anastasia',    ini:'AL', role:'dip', dept:'AVVOLGENTI',       ruolo:'OPERAIO',              co:'primed', col:'#3b82f6', contract:'Indeterminato', tempo:'indeterminato', hours:20, status:'IN', active:true, hire:'2025-03-10' },
  // ── ANTE ────────────────────────────────────────────────
  { id:'e867', mat:'867', fn:'Giuseppe',  ln:'Caramia',        full:'Giuseppe Caramia',     ini:'CG', role:'dip', dept:'ANTE',             ruolo:'OPERAIO',              co:'primed', col:'#0ea5e9', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-02-01' },
  { id:'e920', mat:'920', fn:'Giulio',    ln:'Intermite',      full:'Giulio Intermite',     ini:'IG', role:'dip', dept:'ANTE',             ruolo:'OPERAIO',              co:'primed', col:'#0ea5e9', contract:'Stagionale',    tempo:'determinato',   hours:40, status:'IN', active:true, hire:'2025-04-01', fin_contratto:'2026-09-30' },
  // ── IMBALLI ─────────────────────────────────────────────
  { id:'e859', mat:'859', fn:'Lorenzo',   ln:'Marangi',        full:'Lorenzo Marangi',      ini:'ML', role:'dip', dept:'IMBALLI',          ruolo:'OPERAIO',              co:'primed', col:'#ec4899', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2021-11-15' },
  // ── MAGAZZINO ───────────────────────────────────────────
  { id:'e861', mat:'861', fn:'Simone',    ln:'De Roma',        full:'Simone De Roma',       ini:'DS', role:'dip', dept:'MAGAZZINO',        ruolo:'OPERAIO',              co:'primed', col:'#6b7280', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-08-01' },
  { id:'e871', mat:'871', fn:'Ester',     ln:'Grande',         full:'Ester Grande',         ini:'GE', role:'dip', dept:'MAGAZZINO',        ruolo:'OPERAIO',              co:'primed', col:'#6b7280', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2023-03-01' },
  { id:'e935', mat:'935', fn:'Domenico',  ln:'Formica',        full:'Domenico Formica',     ini:'FD', role:'dip', dept:'MAGAZZINO',        ruolo:'OPERAIO',              co:'primed', col:'#6b7280', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-01-10' },
  // ── PLISSETTATE ─────────────────────────────────────────
  { id:'e864', mat:'864', fn:'Giovanna',  ln:'Cappuccio',      full:'Giovanna Cappuccio',   ini:'CG', role:'dip', dept:'PLISSETTATE',      ruolo:'OPERAIO',              co:'primed', col:'#a855f7', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2020-06-15' },
  { id:'e866', mat:'866', fn:'Angela',    ln:'Chirico',        full:'Angela Chirico',       ini:'CA', role:'dip', dept:'PLISSETTATE',      ruolo:'OPERAIO',              co:'primed', col:'#a855f7', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2021-04-01' },
  { id:'e904', mat:'904', fn:'Vincenzo',  ln:'Anastasia',      full:'Vincenzo Anastasia',   ini:'AV', role:'dip', dept:'PLISSETTATE',      ruolo:'OPERAIO',              co:'primed', col:'#a855f7', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2023-09-01' },
  { id:'e929', mat:'929', fn:'Sabrina',   ln:'Annicchiarico',  full:'Sabrina Annicchiarico',ini:'AS', role:'dip', dept:'PLISSETTATE',      ruolo:'OPERAIO',              co:'primed', col:'#a855f7', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-11-07' },
  { id:'e948', mat:'948', fn:'Alessia',   ln:'Ligorio',        full:'Alessia Ligorio',      ini:'LA', role:'dip', dept:'PLISSETTATE',      ruolo:'OPERAIO',              co:'primed', col:'#a855f7', contract:'Indeterminato', tempo:'indeterminato', hours:20, status:'IN', active:true, hire:'2025-03-10' },
  // ── AUTISTI ─────────────────────────────────────────────
  { id:'e897', mat:'897', fn:'Vito',      ln:'Milito',         full:'Vito Alberto Milito',  ini:'MA', role:'dip', dept:'AUTISTI',          ruolo:'AUTISTA',              co:'primed', col:'#10b981', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2019-01-15' },
  { id:'e926', mat:'926', fn:'Angelo',    ln:"D'Aversa",       full:"Angelo D'Aversa",      ini:'DA', role:'dip', dept:'AUTISTI',          ruolo:'AUTISTA',              co:'primed', col:'#10b981', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2020-09-01' },
  { id:'e947', mat:'947', fn:'Angelo',    ln:'Ingrosso',       full:'Angelo Ingrosso',      ini:'IA', role:'dip', dept:'AUTISTI',          ruolo:'AUTISTA',              co:'primed', col:'#10b981', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2023-06-05' },
  // ── DIVA/SWITCH ─────────────────────────────────────────
  { id:'e919', mat:'919', fn:'Gianmarco', ln:'Meo',            full:'Gianmarco Meo',        ini:'MG', role:'dip', dept:'DIVA/SWITCH',      ruolo:'OPERAIO',              co:'primed', col:'#f97316', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2022-05-02' },
  { id:'e943', mat:'943', fn:'Rosario',   ln:'Dinardo',        full:'Rosario Dinardo',      ini:'DR', role:'dip', dept:'DIVA/SWITCH',      ruolo:'OPERAIO',              co:'primed', col:'#f97316', contract:'Stagionale',    tempo:'determinato',   hours:40, status:'IN', active:true, hire:'2025-03-10', fin_contratto:'2026-09-30' },
  // ── LOGISTICA ───────────────────────────────────────────
  { id:'e944', mat:'944', fn:'Pierluigi', ln:'Quaranta',       full:'Pierluigi Quaranta',   ini:'QP', role:'dip', dept:'LOGISTICA',        ruolo:'OPERAIO',              co:'primed', col:'#84cc16', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2023-01-16' },
  // ── ALTRO ───────────────────────────────────────────────
  { id:'e88',  mat:'88',  fn:'Saverio',   ln:'Patronelli',     full:'Saverio Patronelli',   ini:'PS', role:'dip', dept:'RIPARAZIONI DIVA', ruolo:'TECNICO',              co:'primed', col:'#d97706', contract:'Indeterminato', tempo:'indeterminato', hours:40, status:'IN', active:true, hire:'2018-04-01' },
  { id:'e945', mat:'945', fn:'Patrizia',  ln:'Sasso',          full:'Patrizia Sasso',       ini:'SP', role:'dip', dept:'ALTRO',            ruolo:'IMPIEGATO',            co:'primed', col:'#94a3b8', contract:'Indeterminato', tempo:'indeterminato', hours:30, status:'IN', active:true, hire:'2021-03-01' },
  { id:'e946', mat:'946', fn:'Cinzia',    ln:'Cinieri',        full:'Cinzia Cinieri',       ini:'CC', role:'dip', dept:'ALTRO',            ruolo:'IMPIEGATO',            co:'primed', col:'#94a3b8', contract:'Indeterminato', tempo:'indeterminato', hours:30, status:'IN', active:true, hire:'2022-07-01' },
];

export const findByMat = (mat: string): Employee | undefined =>
  EMPLOYEES.find((e) => e.mat === mat);

export const getActive = (): Employee[] =>
  EMPLOYEES.filter((e) => e.active && e.status === 'IN');

export const getByDept = (dept: string): Employee[] =>
  EMPLOYEES.filter((e) => e.dept === dept);
