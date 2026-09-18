# Registro segnalazioni — pri-presenze-fe

Registro delle segnalazioni ricevute sul canale Slack `#proj-gestione-presenze` (`C0C2BPFS97E`) e del loro stato.

**Numerazione:** `PRES-NNN`, progressiva, assegnata da Claude alla presa in carico. Il numero viene citato in ogni messaggio Slack, così una ricerca su Slack per `PRES-002` riporta tutta la conversazione su quel tema.

**Stati:** `APERTA` · `IN ATTESA` (serve una risposta da chi ha segnalato o una decisione di Alberto) · `IN CORSO` · `RISOLTA` · `CHIUSA` · `ANNULLATA`

---

## Riepilogo

| N. | Data | Da | Oggetto | Stato |
|---|---|---|---|---|
| PRES-001 | 2026-09-16 | Nunzia Convertini | Settimana lavorativa: i flag non salvavano | RISOLTA |
| PRES-002 | 2026-09-16 | Nunzia Convertini | Contratto ciclico, tipologie contratto, conteggio 24/12 mesi | IN ATTESA (decisione Alberto) |

---

## PRES-001 — Settimana lavorativa: i flag non salvavano

- **Aperta:** 2026-09-16 · **Chiusa:** 2026-09-16
- **Segnalata da:** Nunzia Convertini
- **Stato:** RISOLTA, confermata dall'utente in produzione ("tutto funziona", 12:37)

**Problema.** Nella scheda dipendente, tab *Lavoro & Contratto*, i due radio della sezione *Settimana Lavorativa* selezionavano ma non salvavano: uscendo e rientrando tornava il valore precedente.

**Causa.** I radio aggiornavano solo lo stato locale `cfg`; l'unico comando che esegue il `PUT /api/dipendenti/[id]/config` era la `SaveBar` del tab *Anagrafica*. Nel tab *Lavoro & Contratto* non esisteva alcun comando di salvataggio legato a `cfg`.

**Soluzione.** Salvataggio immediato al clic (nessun pulsante Salva), con riscontro visivo a tre stati — *Salvataggio in corso* / *Salvato* / impostazione attualmente registrata — e rollback della selezione con toast di errore se la scrittura fallisce. Corretto anche `DipendenteDB.des_programma`, tipizzato `string` ma valorizzato a `null`, che bloccava `next build`.

**Commit:** `7d658e2` · **Deploy:** 2026-09-16 su `10.130.1.52`

---

## PRES-002 — Contratto ciclico, tipologie contratto, conteggio 24/12 mesi

- **Aperta:** 2026-09-16 · **Stato:** IN ATTESA — requisito chiarito da Nunzia il 2026-09-18, resta da approvare l'approccio con Alberto
- **Segnalata da:** Nunzia Convertini · **Thread Slack:** `1789556575.829469`

**Richiesta.** Quattro punti sulla scheda dipendente, tab *Lavoro & Contratto*:

1. Nel riquadro *Programma* di *Inquadramento attuale*, poter indicare se il contratto è ciclico; le ore settimanali dell'inquadramento devono aggiornarsi da sole quando cambiano le ore previste.
2. In *Storico Contratti*, poter selezionare *A tempo indeterminato* e segnalare se il contratto è ciclico.
3. Aggiungere le tipologie *Tirocinio* e *Altro*, con i dettagli nelle note.
4. Il conteggio dei 24 mesi totali e della soglia 12 mesi deve attivarsi solo per i contratti *a tempo determinato*.

**Analisi svolta.** Punti 3 e 4 chiari e circoscritti: `tipo_contratto` è oggi un campo di testo libero (`page.tsx`, form Storico Contratti) e il conteggio in `api/dipendenti/[id]/contratti/route.ts` somma tutti i contratti senza guardare il tipo.

**Due nodi da sciogliere prima di implementare:**

- *Chi governa `ore_settimanali`.* `syncAnagraficaFromStorico` riscrive già quel campo dal contratto attivo nello storico. Se anche il contratto ciclico lo pilota, due sorgenti scrivono lo stesso dato e vince l'ultima. Va deciso se il ciclico diventa la fonte autorevole o se le ore diventano un valore calcolato e non più persistito.
- *Dati esistenti.* Essendo `tipo_contratto` testo libero, le righe già inserite possono contenere qualsiasi stringa. Filtrando il conteggio sui soli "determinato", le righe non riconosciute uscirebbero dal calcolo **in silenzio** — peggio del bug attuale. Serve verificare cosa contiene la tabella e decidere se normalizzare.

**Risposte di Nunzia (2026-09-18 14:38, nel thread) — requisito ora chiuso dal lato utente:**

1. Nel riquadro *Programma*: **niente casella da spuntare a mano**. Deve compilarsi da solo leggendo il *Contratto Ciclico* già configurato più in basso nella stessa pagina.
2. Le ore settimanali dell'*Inquadramento attuale* devono **cambiare da sole al cambio di periodo** (es. dal 1° maggio 40 → 24), senza riscrittura manuale.
3. Tipologie confermate senza aggiunte: *A tempo determinato*, *A tempo indeterminato*, *Tirocinio*, *Altro*. Somministrato resta dov'è, come `tipo_rapporto`.

**Conseguenza sul nodo 1:** la risposta di Nunzia indica il contratto ciclico come fonte autorevole delle ore settimanali. Resta da confermare con Alberto che `syncAnagraficaFromStorico` smetta di scrivere `ore_settimanali` per i dipendenti con ciclico attivo, altrimenti le due sorgenti continuano a sovrascriversi.

**Prossimo passo (nodo 2, bloccante per il punto 4):** verificare i valori realmente presenti in `tipo_contratto` prima di attivare il filtro sui soli determinati. Comunicato a Nunzia nel thread il 2026-09-18.
