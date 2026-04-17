import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

async function tableExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='${name}'`
  );
  return rows.length > 0;
}

const migrations: { name: string; sql: string }[] = [
  // ── Configurazione dipendente (pausa pranzo, straordinari, banca ore) ──
  {
    name: 'CFXX_HR_DIP_CONFIG',
    sql: `CREATE TABLE CFXX_HR_DIP_CONFIG (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,                        -- FK a CFXX_HR_ANAG_DIP.id
      -- Pausa pranzo
      pausa_minuti    INT NOT NULL DEFAULT 30,             -- Minuti pausa pranzo
      pausa_soglia_ore DECIMAL(4,2) NOT NULL DEFAULT 8.00, -- Ore minime prima di scalare pausa
      pausa_auto      BIT NOT NULL DEFAULT 1,              -- Se 1, la pausa si scala automaticamente
      -- Straordinari / Banca ore flags (indipendenti)
      flg_bop         BIT NOT NULL DEFAULT 0,              -- Banca Ore Presenze (ore extra infrasettimanali)
      flg_boa         BIT NOT NULL DEFAULT 0,              -- Banca Ore Assenza (sabato/festivi)
      flg_bos         BIT NOT NULL DEFAULT 0,              -- Banca Ore Straordinario
      -- Tipo assunzione
      tipo_assunzione NVARCHAR(20) NULL,                   -- 'stagionale' | 'nuovo' | NULL
      stagionale_gia_censito BIT NOT NULL DEFAULT 0,       -- Se stagionale e gia' nel sistema
      -- Kronos / integrazioni placeholder
      kronos_badge    NVARCHAR(50) NULL,
      kronos_attivo   BIT NOT NULL DEFAULT 0,
      -- Timestamps
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL
    )`,
  },
  // ── Contratti ciclici parametrizzabili per dipendente ──
  {
    name: 'CFXX_HR_CONTRATTI_CICLICI',
    sql: `CREATE TABLE CFXX_HR_CONTRATTI_CICLICI (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,                        -- FK a CFXX_HR_ANAG_DIP.id
      -- Periodo 1 (es. settembre-aprile, full-time)
      periodo1_da_mese  INT NOT NULL,                      -- Mese inizio (1-12)
      periodo1_da_giorno INT NOT NULL DEFAULT 1,           -- Giorno inizio
      periodo1_ore_sett DECIMAL(5,2) NOT NULL,             -- Ore settimanali periodo 1
      periodo1_contratto_id INT NULL,                      -- FK a CFXX_PrimedOps_Contratti.ID
      -- Periodo 2 (es. maggio-agosto, part-time)
      periodo2_da_mese  INT NOT NULL,                      -- Mese inizio (1-12)
      periodo2_da_giorno INT NOT NULL DEFAULT 1,           -- Giorno inizio
      periodo2_ore_sett DECIMAL(5,2) NOT NULL,             -- Ore settimanali periodo 2
      periodo2_contratto_id INT NULL,                      -- FK a CFXX_PrimedOps_Contratti.ID
      -- Override date (anticipo/proroga)
      override_data_switch1 DATE NULL,                     -- Data effettiva switch a periodo 1 (se diversa dal default)
      override_data_switch2 DATE NULL,                     -- Data effettiva switch a periodo 2
      anno_riferimento INT NULL,                           -- Anno corrente di override (NULL = regola base)
      attivo          BIT NOT NULL DEFAULT 1,
      note            NVARCHAR(500) NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL
    )`,
  },
  // ── Banca ore settimanale (calcolo straordinari) ──
  {
    name: 'CFXX_HR_BANCA_ORE',
    sql: `CREATE TABLE CFXX_HR_BANCA_ORE (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,
      anno            INT NOT NULL,
      settimana       INT NOT NULL,                        -- Numero settimana ISO
      ore_contrattuali DECIMAL(5,2) NOT NULL DEFAULT 0,    -- Ore da contratto nella settimana
      ore_lavorate    DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Ore effettivamente lavorate
      ore_supplementari DECIMAL(5,2) NOT NULL DEFAULT 0,   -- Solo per PT: ore tra contratto e 40h
      ore_straordinario_pagabile DECIMAL(5,2) NOT NULL DEFAULT 0, -- Max 8h (40h->48h)
      ore_bob         DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Eccedenza oltre 48h -> banca ore
      ore_boa         DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Banca Ore Assenza
      ore_bop         DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Banca Ore Presenze
      ore_bos         DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Banca Ore Straordinario
      calcolato_il    DATETIME NOT NULL DEFAULT GETDATE(),
      note            NVARCHAR(500) NULL
    )`,
  },
  // ── Workflow assunzioni ──
  {
    name: 'CFXX_HR_ASSUNZIONI',
    sql: `CREATE TABLE CFXX_HR_ASSUNZIONI (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      -- Tipo flusso
      tipo            NVARCHAR(20) NOT NULL,               -- 'stagionale' | 'nuovo'
      stato           NVARCHAR(30) NOT NULL DEFAULT 'bozza', -- bozza|in_corso|completata|annullata
      -- Dati anagrafici
      nome            NVARCHAR(100) NOT NULL,
      cognome         NVARCHAR(100) NOT NULL,
      codice_fiscale  NVARCHAR(16) NULL,
      email           NVARCHAR(255) NULL,
      telefono        NVARCHAR(50) NULL,
      -- Dati contrattuali
      data_assunzione DATE NULL,
      data_fine_contratto DATE NULL,
      id_contratto    INT NULL,                            -- FK a CFXX_PrimedOps_Contratti
      id_reparto      INT NULL,                            -- FK a CFXX_HR_REPARTI
      ore_settimanali DECIMAL(5,2) NULL,
      tipo_rapporto   NVARCHAR(30) NULL,                   -- 'diretto' | 'somministrato'
      causale_contratto NVARCHAR(255) NULL,                -- Causale se >12 mesi
      -- Checklist stagionale
      mesi_residui_24 INT NULL,                            -- Mesi residui su 24 max
      superato_12_mesi BIT NOT NULL DEFAULT 0,             -- Flag soglia 12 mesi (serve causale)
      kronos_riattivato BIT NOT NULL DEFAULT 0,
      badge_assegnato BIT NOT NULL DEFAULT 0,
      orario_configurato BIT NOT NULL DEFAULT 0,
      -- Checklist nuovo
      doc_carta_identita BIT NOT NULL DEFAULT 0,
      doc_codice_fiscale BIT NOT NULL DEFAULT 0,
      doc_c2_storico  BIT NOT NULL DEFAULT 0,
      visita_medica_richiesta BIT NOT NULL DEFAULT 0,
      visita_medica_effettuata BIT NOT NULL DEFAULT 0,
      formazione_richiesta BIT NOT NULL DEFAULT 0,
      formazione_effettuata BIT NOT NULL DEFAULT 0,
      scheda_tecsam_generata BIT NOT NULL DEFAULT 0,       -- Placeholder integrazione Tecsam
      scheda_tecsam_inviata BIT NOT NULL DEFAULT 0,
      -- Sincronizzazione (placeholder)
      sync_gestionale BIT NOT NULL DEFAULT 0,
      sync_kronos     BIT NOT NULL DEFAULT 0,
      sync_anagrafica BIT NOT NULL DEFAULT 0,
      -- Ref al dipendente se gia' esistente (stagionale)
      dip_id          INT NULL,                            -- FK a CFXX_HR_ANAG_DIP.id (se stagionale)
      -- Meta
      creato_da       NVARCHAR(100) NULL,
      note            NVARCHAR(MAX) NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL
    )`,
  },
  // ── Documenti assunzione ──
  {
    name: 'CFXX_HR_DOCUMENTI',
    sql: `CREATE TABLE CFXX_HR_DOCUMENTI (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      assunzione_id   INT NULL,                            -- FK a CFXX_HR_ASSUNZIONI.id
      dip_id          INT NULL,                            -- FK a CFXX_HR_ANAG_DIP.id
      tipo_documento  NVARCHAR(50) NOT NULL,               -- 'carta_identita'|'codice_fiscale'|'c2_storico'|'altro'
      nome_file       NVARCHAR(255) NOT NULL,
      path_file       NVARCHAR(500) NOT NULL,
      mime_type       NVARCHAR(100) NULL,
      dimensione      INT NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE()
    )`,
  },
  // ── Presenze/Timbrature giornaliere ──
  {
    name: 'CFXX_HR_PRESENZE',
    sql: `CREATE TABLE CFXX_HR_PRESENZE (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,
      data            DATE NOT NULL,
      -- Timbrature (fino a 6 coppie IN/OUT)
      in1             TIME NULL,
      out1            TIME NULL,
      in2             TIME NULL,
      out2            TIME NULL,
      in3             TIME NULL,
      out3            TIME NULL,
      -- Calcoli
      ore_teoriche    DECIMAL(5,2) NOT NULL DEFAULT 0,
      ore_lavorate    DECIMAL(5,2) NOT NULL DEFAULT 0,
      ore_pausa       DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Pausa scalata (0 se sotto soglia)
      ore_nette       DECIMAL(5,2) NOT NULL DEFAULT 0,     -- Lavorate - pausa
      -- Stato
      stato           NVARCHAR(20) NOT NULL DEFAULT 'ok',  -- ok|anomalia|assenza|festivo|weekend
      nota            NVARCHAR(500) NULL,
      data_mod        DATETIME NULL
    )`,
  },
  // ── Estensione config dipendente: campi anagrafici + tipo rapporto ──
  {
    name: 'CFXX_HR_DIP_CONFIG__v2',
    sql: `
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='codice_fiscale')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD codice_fiscale NVARCHAR(16) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='email')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD email NVARCHAR(255) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='telefono')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD telefono NVARCHAR(50) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='tipo_rapporto')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD tipo_rapporto NVARCHAR(30) NULL;
    `,
  },
  // ── Estensione config: anagrafica completa stile HR ──
  {
    name: 'CFXX_HR_DIP_CONFIG__v3',
    sql: `
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='data_nascita')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD data_nascita DATE NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='luogo_nascita')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD luogo_nascita NVARCHAR(100) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='genere')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD genere NVARCHAR(1) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='nazionalita')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD nazionalita NVARCHAR(50) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='indirizzo')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD indirizzo NVARCHAR(255) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='citta')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD citta NVARCHAR(100) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='cap')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD cap NVARCHAR(10) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='provincia')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD provincia NVARCHAR(5) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='iban')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD iban NVARCHAR(34) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='contatto_emergenza')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD contatto_emergenza NVARCHAR(200) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='contatto_emergenza_tel')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD contatto_emergenza_tel NVARCHAR(50) NULL;
    `,
  },
  // ── Estensione config: regole pausa multi-livello ──
  {
    name: 'CFXX_HR_DIP_CONFIG__v4',
    sql: `
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='regole_pausa')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD regole_pausa NVARCHAR(MAX) NULL;
    `,
  },
  // ── Estensione config: documenti onboarding ──
  {
    name: 'CFXX_HR_DIP_CONFIG__v5',
    sql: `
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_carta_identita')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_carta_identita BIT NOT NULL DEFAULT 0;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_codice_fiscale')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_codice_fiscale BIT NOT NULL DEFAULT 0;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_c2_storico')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_c2_storico BIT NOT NULL DEFAULT 0;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_permesso_soggiorno')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_permesso_soggiorno BIT NOT NULL DEFAULT 0;
    `,
  },
  // ── Estensione config: PEC + allegati documenti ──
  {
    name: 'CFXX_HR_DIP_CONFIG__v6',
    sql: `
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='pec')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD pec NVARCHAR(255) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_ci_file')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_ci_file NVARCHAR(500) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_cf_file')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_cf_file NVARCHAR(500) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_c2_file')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_c2_file NVARCHAR(500) NULL;
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_DIP_CONFIG' AND COLUMN_NAME='doc_ps_file')
        ALTER TABLE CFXX_HR_DIP_CONFIG ADD doc_ps_file NVARCHAR(500) NULL;
    `,
  },
  // ── Storico contratti dipendente ──
  {
    name: 'CFXX_HR_STORICO_CONTRATTI',
    sql: `CREATE TABLE CFXX_HR_STORICO_CONTRATTI (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,
      data_inizio     DATE NOT NULL,
      data_fine       DATE NULL,
      tipo_contratto  NVARCHAR(100) NULL,
      ore_settimanali DECIMAL(5,2) NULL,
      tipo_rapporto   NVARCHAR(30) NULL,
      note            NVARCHAR(500) NULL,
      attivo          BIT NOT NULL DEFAULT 1,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL
    )`,
  },
  // ── Saldi dipendente (ferie, ROL, banca ore, BOP) ──
  {
    name: 'CFXX_HR_SALDI',
    sql: `CREATE TABLE CFXX_HR_SALDI (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,
      anno            INT NOT NULL,
      mese            INT NOT NULL,
      ferie_maturate  DECIMAL(6,2) NOT NULL DEFAULT 0,
      ferie_usate     DECIMAL(6,2) NOT NULL DEFAULT 0,
      rol_maturato    DECIMAL(6,2) NOT NULL DEFAULT 0,
      rol_usato       DECIMAL(6,2) NOT NULL DEFAULT 0,
      banca_ore       DECIMAL(6,2) NOT NULL DEFAULT 0,
      banca_ore_usata DECIMAL(6,2) NOT NULL DEFAULT 0,
      bop             DECIMAL(6,2) NOT NULL DEFAULT 0,
      bop_usato       DECIMAL(6,2) NOT NULL DEFAULT 0,
      note            NVARCHAR(500) NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL,
      CONSTRAINT UQ_SALDI UNIQUE (dip_id, anno, mese)
    )`,
  },
  // ── Ristruttura SALDI per formato consulente ──
  {
    name: 'CFXX_HR_SALDI__v2',
    sql: `
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CFXX_HR_SALDI' AND COLUMN_NAME='ferie_ap')
      BEGIN
        ALTER TABLE CFXX_HR_SALDI ADD ferie_ap DECIMAL(6,2) NOT NULL DEFAULT 0;
        ALTER TABLE CFXX_HR_SALDI ADD ferie_residuo DECIMAL(6,2) NOT NULL DEFAULT 0;
        ALTER TABLE CFXX_HR_SALDI ADD rol_ap DECIMAL(6,2) NOT NULL DEFAULT 0;
        ALTER TABLE CFXX_HR_SALDI ADD rol_residuo DECIMAL(6,2) NOT NULL DEFAULT 0;
        ALTER TABLE CFXX_HR_SALDI ADD banca_ore_ap DECIMAL(6,2) NOT NULL DEFAULT 0;
        ALTER TABLE CFXX_HR_SALDI ADD banca_ore_residuo DECIMAL(6,2) NOT NULL DEFAULT 0;
      END
    `,
  },
  // ── Profili parametri con filtri (auto-applicazione) ──
  {
    name: 'CFXX_HR_PROFILI_PARAMETRI',
    sql: `CREATE TABLE CFXX_HR_PROFILI_PARAMETRI (
      id                          INT IDENTITY(1,1) PRIMARY KEY,
      nome                        NVARCHAR(100) NOT NULL,
      -- Filtri (NULL = qualsiasi valore)
      filtro_tipo_contratto       NVARCHAR(100) NULL,
      filtro_tipo_rapporto        NVARCHAR(30) NULL,
      filtro_ore_da               DECIMAL(5,2) NULL,
      filtro_ore_a                DECIMAL(5,2) NULL,
      -- Parametri pausa
      regole_pausa                NVARCHAR(MAX) NULL,
      pausa_minuti                INT NOT NULL DEFAULT 30,
      pausa_soglia_ore            DECIMAL(4,2) NOT NULL DEFAULT 8.00,
      pausa_auto                  BIT NOT NULL DEFAULT 1,
      -- Parametri eccesso/difetto
      eccesso_pipeline            NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      deficit_pipeline            NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      straordinario_max_sett      DECIMAL(5,2) NOT NULL DEFAULT 8.00,
      straordinario_max_giorno    DECIMAL(5,2) NOT NULL DEFAULT 2.00,
      straordinario_priorita_sabato BIT NOT NULL DEFAULT 1,
      -- Meta
      priorita                    INT NOT NULL DEFAULT 0,
      attivo                      BIT NOT NULL DEFAULT 1,
      note                        NVARCHAR(500) NULL,
      data_ins                    DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod                    DATETIME NULL
    )`,
  },
  // ── Regole globali calcolo ore (pipeline eccesso/deficit) ──
  {
    name: 'CFXX_HR_REGOLE_GLOBALI',
    sql: `CREATE TABLE CFXX_HR_REGOLE_GLOBALI (
      id                          INT IDENTITY(1,1) PRIMARY KEY,
      nome                        NVARCHAR(100) NOT NULL DEFAULT 'Default',
      -- Pipeline eccesso Full-Time (JSON array ordinato)
      ft_eccesso_pipeline         NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      -- Pipeline eccesso Part-Time (dopo supplementari, per ore >40h)
      pt_eccesso_pipeline         NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      pt_supplementari_attivo     BIT NOT NULL DEFAULT 1,
      -- Cap legali straordinario
      straordinario_max_sett      DECIMAL(5,2) NOT NULL DEFAULT 8.00,
      straordinario_max_giorno    DECIMAL(5,2) NOT NULL DEFAULT 2.00,
      straordinario_priorita_sabato BIT NOT NULL DEFAULT 1,
      -- Pipeline deficit (JSON array ordinato)
      deficit_pipeline            NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      -- Default pausa pranzo
      pausa_minuti_default        INT NOT NULL DEFAULT 30,
      pausa_soglia_ore_default    DECIMAL(4,2) NOT NULL DEFAULT 8.00,
      pausa_auto_default          BIT NOT NULL DEFAULT 1,
      attivo                      BIT NOT NULL DEFAULT 1,
      data_ins                    DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod                    DATETIME NULL
    )`,
  },
  // ── Override regole per singolo dipendente (NULL = eredita globale) ──
  {
    name: 'CFXX_HR_DIP_REGOLE',
    sql: `CREATE TABLE CFXX_HR_DIP_REGOLE (
      id                          INT IDENTITY(1,1) PRIMARY KEY,
      dip_id                      INT NOT NULL,
      ft_eccesso_pipeline         NVARCHAR(MAX) NULL,
      pt_eccesso_pipeline         NVARCHAR(MAX) NULL,
      pt_supplementari_attivo     BIT NULL,
      straordinario_max_sett      DECIMAL(5,2) NULL,
      straordinario_max_giorno    DECIMAL(5,2) NULL,
      straordinario_priorita_sabato BIT NULL,
      deficit_pipeline            NVARCHAR(MAX) NULL,
      note                        NVARCHAR(500) NULL,
      data_ins                    DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod                    DATETIME NULL,
      CONSTRAINT UQ_DIP_REGOLE UNIQUE (dip_id)
    )`,
  },
  // ── Template orari multi-settimanali ──
  {
    name: 'CFXX_HR_ORARI_TEMPLATE',
    sql: `CREATE TABLE CFXX_HR_ORARI_TEMPLATE (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      nome            NVARCHAR(100) NOT NULL,
      num_settimane   INT NOT NULL DEFAULT 1,
      attivo          BIT NOT NULL DEFAULT 1,
      note            NVARCHAR(500) NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL
    )`,
  },
  // ── Dettaglio giorni per template orario ──
  {
    name: 'CFXX_HR_ORARI_TEMPLATE_GIORNI',
    sql: `CREATE TABLE CFXX_HR_ORARI_TEMPLATE_GIORNI (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      template_id     INT NOT NULL,
      settimana_num   INT NOT NULL,
      giorno_settimana INT NOT NULL,
      ore_teoriche    DECIMAL(5,2) NOT NULL DEFAULT 0,
      orario_inizio   TIME NULL,
      orario_fine     TIME NULL,
      CONSTRAINT UQ_TMPL_GIORNO UNIQUE (template_id, settimana_num, giorno_settimana)
    )`,
  },
  // ── Assegnazione template orario a dipendente ──
  {
    name: 'CFXX_HR_DIP_ORARIO',
    sql: `CREATE TABLE CFXX_HR_DIP_ORARIO (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,
      template_id     INT NOT NULL,
      data_inizio_ciclo DATE NOT NULL,
      attivo          BIT NOT NULL DEFAULT 1,
      note            NVARCHAR(500) NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL,
      CONSTRAINT UQ_DIP_ORARIO UNIQUE (dip_id)
    )`,
  },
  // ── Tecsam: tracciamento visite mediche e formazione ──
  {
    name: 'CFXX_HR_TECSAM',
    sql: `CREATE TABLE CFXX_HR_TECSAM (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      dip_id          INT NOT NULL,
      tipo            NVARCHAR(30) NOT NULL,
      descrizione     NVARCHAR(500) NOT NULL,
      data_scadenza   DATE NULL,
      data_prossima   DATE NULL,
      data_effettuata DATE NULL,
      stato           NVARCHAR(20) NOT NULL DEFAULT 'da_programmare',
      esito           NVARCHAR(500) NULL,
      note            NVARCHAR(MAX) NULL,
      creato_da       NVARCHAR(100) NULL,
      data_ins        DATETIME NOT NULL DEFAULT GETDATE(),
      data_mod        DATETIME NULL
    )`,
  },
];

export async function POST() {
  const results: { table: string; status: string }[] = [];

  for (const m of migrations) {
    try {
      // Migrazioni ALTER (nome contiene "__v") vanno sempre eseguite
      if (m.name.includes('__v')) {
        await execute(m.sql);
        results.push({ table: m.name, status: 'applied' });
      } else {
        const exists = await tableExists(m.name);
        if (exists) {
          results.push({ table: m.name, status: 'already exists' });
        } else {
          await execute(m.sql);
          results.push({ table: m.name, status: 'created' });
        }
      }
    } catch (error: any) {
      results.push({ table: m.name, status: `error: ${error.message}` });
    }
  }

  return NextResponse.json({ results });
}
