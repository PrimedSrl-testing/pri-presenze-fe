// src/data/users.ts
export interface MockUser {
  id: string;
  mat: string;
  name: string;
  full: string;
  ini: string;
  role: 'dip' | 'mgr' | 'hr' | 'dir' | 'prod';
  dept: string;
  ruolo: string;
  col: string;
  email: string;
  password: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'u_hr_1',
    mat: '999',
    name: 'Noemi Attanasio',
    full: 'Noemi Attanasio',
    ini: 'NA',
    role: 'hr',
    dept: 'AMMINISTRAZIONE',
    ruolo: 'HR Manager',
    col: '#6366f1',
    email: 'n.attanasio@primed.it',
    password: 'hr2026',
  },
  {
    id: 'u_mgr_1',
    mat: '72',
    name: 'Leonardo Colucci',
    full: 'Leonardo Colucci',
    ini: 'LC',
    role: 'mgr',
    dept: 'AVVOLGENTI',
    ruolo: 'Capo Reparto',
    col: '#3b82f6',
    email: 'l.colucci@primed.it',
    password: 'mgr2026',
  },
  {
    id: 'u_dip_1',
    mat: '1',
    name: 'Mario Russo',
    full: 'Mario Russo',
    ini: 'MR',
    role: 'dip',
    dept: 'AVVOLGENTI',
    ruolo: 'Operaio',
    col: '#3b82f6',
    email: 'm.russo@primed.it',
    password: 'dip2026',
  },
  {
    id: 'u_dir_1',
    mat: '0',
    name: 'Direzione PRIMED',
    full: 'Direzione PRIMED',
    ini: 'DP',
    role: 'dir',
    dept: 'DIREZIONE',
    ruolo: 'Direttore',
    col: '#f59e0b',
    email: 'direzione@primed.it',
    password: 'dir2026',
  },
  {
    id: 'u_prod_1',
    mat: '55',
    name: 'Ciro Masciullo',
    full: 'Ciro Masciullo',
    ini: 'CM',
    role: 'prod',
    dept: 'AVVOLGENTI',
    ruolo: 'Responsabile Produzione',
    col: '#10b981',
    email: 'c.masciullo@primed.it',
    password: 'prod2026',
  },
];

export const ROLE_LABELS: Record<string, string> = {
  dip: 'Dipendente',
  mgr: 'Capo Reparto',
  hr: 'Risorse Umane',
  dir: 'Direzione',
  prod: 'Resp. Produzione',
};

export const ROLE_COLORS: Record<string, string> = {
  dip: '#3b82f6',
  mgr: '#8b5cf6',
  hr: '#6366f1',
  dir: '#f59e0b',
  prod: '#10b981',
};
