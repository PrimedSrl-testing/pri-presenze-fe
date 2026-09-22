# Registro segnalazioni — pri-presenze-fe

Registro delle segnalazioni ricevute sul canale Slack `#proj-gestione-presenze` (`C0C2BPFS97E`) e del loro stato.

**Numerazione:** `PRES-NNN`, progressiva, assegnata da Claude alla presa in carico. Il numero viene citato in ogni messaggio Slack, così una ricerca su Slack per `PRES-002` riporta tutta la conversazione su quel tema.

**Stati:** `APERTA` · `IN ATTESA` (serve una risposta da chi ha segnalato o una decisione di Alberto) · `IN CORSO` · `RISOLTA` · `CHIUSA` · `ANNULLATA`

---

## Riepilogo

| N. | Data | Da | Oggetto | Stato |
|---|---|---|---|---|
| PRES-001 | 2026-09-16 | Nunzia Convertini | Settimana lavorativa: i flag non salvavano | RISOLTA |
| PRES-002 | 2026-09-16 | Nunzia Convertini | Contratto ciclico, tipologie contratto, conteggio 24/12 mesi | IN CORSO — tipologie fatte, punto 1 non si fa, punto 4 da normalizzare |
| PRES-003 | 2026-09-22 | Nunzia Convertini | Trasformazione oraria dentro lo stesso contratto | IN ATTESA — requisito chiuso, serve decisione Alberto |

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

### Avanzamento

**2026-09-22 — punto 3 CONSEGNATO** (commit `064512d`, deployato). Nello Storico Contratti il campo *Tipo contratto* non è più testo libero ma una tendina: *A tempo determinato*, *A tempo indeterminato*, *Tirocinio*, *Altro* (con richiamo a usare le note). Una tipologia già registrata a mano libera resta selezionabile come "(valore esistente)": senza questo accorgimento, riaprendo un contratto vecchio la sua tipologia verrebbe cambiata in silenzio al primo salvataggio. Il punto è indipendente dai due nodi aperti, quindi è stato fatto in autonomia.

**2026-09-22 — sollecito.** Nunzia ha chiesto aggiornamenti alle 15:41; risposto nel thread con lo stato reale e il motivo dell'attesa. Inviati ad Alberto DM Slack ed email di sollecito sui due nodi ancora aperti.

**Restano aperti:** punto 1 (contratto ciclico nel riquadro Programma + ore che seguono il periodo) e punto 4 (conteggio 24/12 mesi solo sui determinati).


---

## PRES-003 — Trasformazione oraria dentro lo stesso contratto

- **Aperta:** 2026-09-22 · **Stato:** IN ATTESA — requisito chiuso da Nunzia il 2026-09-22, servono due decisioni di Alberto e una specifica scritta
- **Segnalata da:** Nunzia Convertini · **Thread Slack:** `1790086790.997949`

**Richiesta.** Poter registrare una *trasformazione oraria* all'interno dello stesso periodo contrattuale, senza chiudere il contratto in corso e aprirne uno nuovo. Il rapporto resta lo stesso, cambiano le condizioni orarie per un certo lasso di tempo. Esempi portati: part-time 36h su 6 giorni che passa temporaneamente a 40h su 5 giorni; indeterminato 40h ridotto a part-time per un periodo prestabilito; ciclico programmato a marzo anticipato a febbraio. Serve la cronologia delle variazioni con data di decorrenza e durata.

**Perché non è un campo in più.** `CFXX_HR_DIP_ORARIO` ha `CONSTRAINT UQ_DIP_ORARIO UNIQUE (dip_id)`: un solo orario per dipendente, e `data_inizio_ciclo` è l'ancora del ciclo, non un periodo di validità. Oggi cambiare orario sovrascrive il precedente e il passato sparisce. Serve un'assegnazione versionata (`valido_dal` / `valido_al`) più un risolutore "quale orario vale alla data X": oggi tutto il codice legge *l'orario del dipendente* sottintendendo **adesso**.

**Nodi da decidere con Alberto:**

1. *Storico o fotografia.* Una variazione con decorrenza passata fa rifare i conteggi già prodotti, o questi restano congelati? Determina l'architettura: risolutore per data ovunque, oppure snapshot sulle presenze.
2. *Convivenza col contratto ciclico.* Il ciclico fa già un override del template per periodo (`api/dipendenti/[id]/orario/route.ts`, `getPeriodoAttivo`). Con le variazioni due meccanismi rispondono alla stessa domanda: o le variazioni assorbono il ciclico, o serve una precedenza esplicita.
3. *Ambito.* Le variazioni cambiano solo l'articolazione settimanale o anche il monte ore contrattuale (36→40)? Nel secondo caso si torna su `ore_settimanali`.

**Chiarimenti chiesti a Nunzia (2026-09-22, nel thread):** se la variazione ha sempre una data di fine o può restare aperta; se alla scadenza si torna da soli all'orario precedente; se una decorrenza passata deve far rifare i conteggi. Segnalato inoltre che il terzo esempio (ciclico anticipato) è già possibile oggi modificando la data di avvio, e va trattato a parte.

**Escalation ad Alberto:** DM Slack ed email inviati il 2026-09-22.

**Risposte di Nunzia (2026-09-22 18:32) — requisito chiuso dal lato utente:**

1. La variazione ha **sempre** una data di fine.
2. Alla scadenza si **torna da soli** all'orario precedente.
3. Una decorrenza passata fa **rifare** i conteggi già prodotti.
4. Il ciclico anticipato è fuori scope: lo fa già cambiando le date (confermato da lei).

**Conseguenza sull'architettura.** Le prime due semplificano: variazioni sempre chiuse e ritorno automatico ⇒ modello a intervalli, nessuno stato aperto. La terza esclude lo snapshot e impone un **risolutore per data** usato da ogni calcolo — oggi il codice risponde solo a "quale orario vale adesso".

**Modello proposto** (una tabella nuova, `CFXX_HR_DIP_ORARIO` resta com'è):
`CFXX_HR_ORARIO_VARIAZIONI (id, dip_id, data_inizio, data_fine, template_id, ore_settimanali NULL, note)`, sempre con entrambe le date.
Risolutore `orarioAllaData(dip_id, data)`: variazione che copre la data → ciclico se attivo → base. Il ritorno automatico all'orario precedente non richiede scritture: scaduta la variazione, il risolutore ricade sul livello sottostante.

**Decisioni ancora in capo ad Alberto:** precedenza variazione/ciclico (raccomandazione: variazione davanti, è un'eccezione esplicita) e ambito (se la variazione tocca anche il monte ore, si ritorna su `ore_settimanali`). Il costo non è la tabella ma il risolutore, da inserire in ogni punto che legge l'orario.

**Comunicazioni:** risposta a Nunzia nel thread, DM Slack ed email ad Alberto il 2026-09-22.
