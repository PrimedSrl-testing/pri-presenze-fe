/**
 * Knowledge Base del sistema PRIMED HR.
 *
 * Questa è la UNICA fonte di verità per l'assistente AI.
 * Ogni sezione descrive ESATTAMENTE cosa fa il sistema.
 * L'AI NON DEVE MAI inventare funzionalità non descritte qui.
 */

export const SYSTEM_KNOWLEDGE = `
=== SISTEMA PRIMED HR — MANUALE OPERATIVO COMPLETO ===

Questo documento descrive ESATTAMENTE cosa fa ogni pagina del gestionale PRIMED HR.
Rispondi SOLO sulla base di quanto scritto qui. Se qualcosa non è descritto, rispondi:
"Questa funzionalità non è documentata nel sistema attuale. Ti consiglio di verificare con il responsabile tecnico."

────────────────────────────────────────────
1. DASHBOARD (/dashboard)
────────────────────────────────────────────
KPI mostrate: Dipendenti attivi, Presenti ora, Anomalie aperte, Richieste pendenti.
Card sinistra: Contratti in scadenza (mostra nome, reparto, data scadenza, giorni rimanenti).
Card destra: Richieste da approvare (nome, causale, periodo). Si possono approvare/rifiutare con nota del manager.
Tabella: Panoramica team con nome, reparto, stato presenza, ore settimanali, anomalie.

────────────────────────────────────────────
2. DIPENDENTI (/dipendenti)
────────────────────────────────────────────
Lista di tutti i dipendenti attivi. Ricerca per nome, reparto o matricola.
Colonne: Nome+avatar, Matricola, Reparto, Mansione, Tipo contratto (badge), Stato (presente/assente).
Cliccando su un dipendente si accede alla sua configurazione.

────────────────────────────────────────────
3. CONFIGURAZIONE DIPENDENTE (/dipendenti/[id]/configurazione)
────────────────────────────────────────────
Pagina di configurazione per singolo dipendente. Contiene queste sezioni:

A) PAUSA PRANZO:
   - Minuti pausa (default 30)
   - Soglia ore minime: la pausa si scala SOLO se le ore lavorate superano questo valore (default 8h)
   - Toggle "Detrazione automatica attiva"
   - Esempio: se soglia=8h e minuti=30, un turno di 6h → nessuna pausa scalata. Un turno di 9h → 30 min scalati.

B) BANCA ORE (flag legacy):
   - BOP (Banca Ore Presenze): ore extra infrasettimanali vanno in banca ore
   - BOA (Banca Ore Assenza): ore sabato/festivi vanno in banca ore
   - BOS (Banca Ore Straordinario): lo straordinario NON viene pagato, va in banca ore

C) REGOLE GESTIONE ORE:
   - Banner: "Usa regole globali" oppure "Regole personalizzate"
   - Toggle Override per attivare regole personalizzate per questo dipendente
   - Se attivato mostra:
     * Pipeline Eccesso Full-Time: sequenza ordinata di destinazioni (BOA, Straordinario, BOP, BOS) con max ore
     * Pipeline Eccesso Part-Time: stessa cosa per part-time
     * Pipeline Deficit: da dove attingere ore mancanti (Ferie, ROL, BOA, BOP) con tipo (giornata intera/parziale)
     * Cap straordinario: max ore/settimana, max ore/giorno, priorità sabato
   - Bottone "Ripristina globali" per tornare alle regole default

D) ORARIO SETTIMANALE:
   - Dropdown per selezionare un template orario (creati in /configurazione/orari-template)
   - Data inizio ciclo: il lunedì da cui parte la Settimana A
   - Link per gestire i template orari

E) INFORMAZIONI ASSUNZIONE:
   - Tipo: Stagionale / Nuovo / Non specificato
   - Se stagionale: checkbox "Già censito nel sistema"

F) INTEGRAZIONE KRONOS:
   - Placeholder per funzionalità futura (disabilitato)

────────────────────────────────────────────
4. REGOLE CALCOLO ORE (/configurazione/regole-calcolo)
────────────────────────────────────────────
Pagina per configurare le REGOLE GLOBALI che si applicano a tutti i dipendenti di default.

Sezioni:
A) Pipeline Eccesso Full-Time: come gestire le ore in eccedenza per dipendenti >=40h/settimana.
   Ogni step ha: destinazione (BOA/Straordinario/BOP/BOS) + max ore (vuoto = illimitato).
   Il flusso è ordinato: il sistema processa gli step in sequenza.

B) Pipeline Eccesso Part-Time: come gestire eccedenze per <40h/settimana.
   Il supplementare (ore tra contratto e 40h) viene calcolato automaticamente prima della pipeline.

C) Cap Legali Straordinario:
   - Max ore/settimana (default 8h)
   - Max ore/giorno (default 2h)
   - Priorità sabato: il sistema calcola lo straordinario partendo dalle ore del sabato

D) Pipeline Deficit: da quali fonti attingere quando il dipendente lavora meno delle ore contrattuali.
   Fonti disponibili: Ferie (giornata intera), ROL (ore parziali), BOA, BOP.
   Ordine = priorità di utilizzo.

E) Default Pausa Pranzo: valori di default per tutti i dipendenti.

COME FUNZIONA LA CASCATA (esempio Full-Time):
Se un dipendente FT lavora 50h in una settimana con contratto 40h:
- Eccedenza = 10h
- Step 1 "Straordinario max 8h": alloca 8h → rimangono 2h
- Step 2 "BOP illimitato": alloca 2h → rimangono 0h
Risultato: 8h straordinario pagabile + 2h in salvadanaio BOP.

────────────────────────────────────────────
5. TEMPLATE ORARI (/configurazione/orari-template)
────────────────────────────────────────────
Gestione di schemi orari multi-settimanali con rotazione automatica.
Ogni template ha:
- Nome (es. "Rotazione 2 settimane")
- Numero settimane nel ciclo (1-4): 1=fisso, 2=A/B, 3=A/B/C, 4=A/B/C/D
- Griglia editabile: righe = Lun-Dom, colonne = Sett. A/B/C/D
- Ogni cella ha le ore teoriche del giorno
- Totale ore per settimana mostrato in fondo

Esempio: Template "Turnazione A/B" con 2 settimane
- Sett. A: Lun 8h, Mar 8h, Mer 8h, Gio 8h, Ven 8h = 40h (Lun-Ven)
- Sett. B: Lun 7h, Mar 7h, Mer 7h, Gio 7h, Ven 6h, Sab 6h = 40h (Lun-Sab)

Il template viene poi assegnato al dipendente nella sua configurazione.

────────────────────────────────────────────
6. TIMBRATURE (/timbrature)
────────────────────────────────────────────
Visualizzazione giornaliera delle timbrature in entrata e uscita.
KPI: In sede ora, Usciti oggi, Non timbranti.
Tabella: Nome, Reparto, Orario ingresso, Orario uscita, Stato (In sede/Uscito/Assente).

────────────────────────────────────────────
7. ANOMALIE (/anomalie)
────────────────────────────────────────────
Gestione delle anomalie di presenza. Filtri per stato e gravità.
Tipi: Timbratura mancante, Orario insufficiente, Assenza ingiustificata, Ritardo, Uscita anticipata.
Gravità: Alta (rossa), Media (gialla), Bassa (blu).
Stati: Aperta, In lavorazione, Risolta.
Si può risolvere un'anomalia aggiungendo una motivazione.

────────────────────────────────────────────
8. RICHIESTE (/richieste)
────────────────────────────────────────────
Gestione richieste ferie e permessi. Filtro per stato.
Colonne: Dipendente, Causale, Dal, Al, Note, Stato, Nota manager.
Si può creare una nuova richiesta con: Causale, Date, Ore (per permessi orari), Note.
Stati: In attesa (giallo), Approvata (verde), Rifiutata (rosso).

────────────────────────────────────────────
9. STRAORDINARI (/straordinari)
────────────────────────────────────────────
Riepilogo settimanale straordinari con calcolo automatico.
REGOLE LEGALI: Max 48h/settimana totali. Straordinario pagabile max 8h/settimana.
Eccedenza oltre 48h → BOB (Banca Ore).

KPI: Ore Straordinario, Ore Supplementari (solo PT), Ore BOB, Dipendenti con eccedenze.
Filtri: Per dipendente, anno, range mesi.
Azioni: Ricalcola, Esporta per Consulente (genera file Excel).

LOGICA DI CALCOLO:
- Full-Time (>=40h): ore oltre 40h = straordinario (max 8h/sett), oltre 48h = BOB
- Part-Time (<40h): ore tra contratto e 40h = supplementare, oltre 40h = straordinario, oltre 48h = BOB
- Se configurate le regole pipeline: il sistema usa la cascata configurata
- Se non configurate: usa il calcolo legacy

────────────────────────────────────────────
10. CONTRATTI CICLICI (/contratti-ciclici)
────────────────────────────────────────────
Per dipendenti stagionali con orari diversi in periodi dell'anno.
Ogni contratto ciclico ha 2 periodi con:
- Data inizio (mese/giorno)
- Ore settimanali
- Tipo contratto
Si possono impostare override per anticipare/posticipare il cambio nell'anno corrente.
Timeline visuale mostra i due periodi.

────────────────────────────────────────────
11. ASSUNZIONI (/assunzioni)
────────────────────────────────────────────
Due percorsi:

A) STAGIONALE (riattivazione ex dipendente):
   - Cerca dipendente esistente
   - Calcolo automatico mesi residui su 24
   - Se superati 12 mesi: serve causale contrattuale
   - Checklist: Kronos riattivato, Badge assegnato, Orario configurato

B) NUOVO DIPENDENTE:
   - Dati anagrafici: Nome, Cognome, CF, Email, Telefono
   - Dati contrattuali: Date, Tipo contratto, Ore, Reparto, Tipo rapporto
   - Checklist documenti: Carta identità, Codice fiscale, C2 storico
   - Visite/Formazione: Visita medica, Formazione (richiesta → effettuata)
   - Tecsam: Scheda generata → inviata
   - Sync: Gestionale, Kronos, Anagrafica

Dashboard controllo (/assunzioni/dashboard): Kanban per stato + tabella checklist + alert.

────────────────────────────────────────────
12. VISITE & FORMAZIONI — TECSAM (/tecsam)
────────────────────────────────────────────
Dashboard per tracciamento manuale di visite mediche e corsi di formazione.
KPI: Visite pendenti, Formazioni pendenti, Scadute, Da programmare.
Tabella con filtri per dipendente, tipo, stato.
Ogni record ha: Dipendente, Tipo (visita_medica/formazione/altro), Descrizione,
Data scadenza, Data prossima, Data effettuata, Stato, Esito, Note.
Stati: Da programmare, Programmata, Effettuata, Scaduta.
Si possono creare, modificare, eliminare record.

────────────────────────────────────────────
13. CHIUSURA MESE (/chiusura)
────────────────────────────────────────────
Checklist pre-chiusura con 6 punti:
1. Anomalie risolte (automatico, rosso se aperte)
2. Richieste elaborate (automatico, giallo se pendenti)
3. Timbrature verificate (manuale)
4. Ferie conteggiate (manuale)
5. Straordinari approvati (manuale)
6. Export paghe pronto (manuale)
Il mese si chiude solo quando tutti i punti sono verificati.

────────────────────────────────────────────
14. CONSOLE MESE (/console-mese)
────────────────────────────────────────────
Panoramica mensile: Dipendenti attivi, Ore lavorate vs teoriche, Saldo ore, Anomalie aperte.
Card richieste: contatori per stato. Card ore: teoriche, lavorate, copertura %.

────────────────────────────────────────────
15. CONTATORI (/contatori)
────────────────────────────────────────────
Saldi ferie, ROL e straordinari per tutti i dipendenti.
Colonne: Dipendente, Reparto, Ferie residue, ROL residuo, Ore extra, % Ferie usate.
Colori: Rosso se ferie < 5gg o ROL < 8h. Giallo se ferie < 10gg o ROL < 16h.

────────────────────────────────────────────
16. SALDO FERIE (/saldo-ferie)
────────────────────────────────────────────
Vista dipendente: Giorni ferie residui, ROL residuo, Ore straordinario.
Barre progresso per utilizzo ferie e ROL.

────────────────────────────────────────────
17. CONFIGURAZIONE CAUSALI (/configurazione/causali)
────────────────────────────────────────────
Gestione tipologie di assenza/permesso.
Campi: Nome, Icona, Tipo durata, Protezione (protetta/compensabile/neutra), Colore,
Approvazione HR, Visibilità dipendente, Attiva.

────────────────────────────────────────────
18. CONFIGURAZIONE REPARTI (/configurazione/reparti)
────────────────────────────────────────────
Assegnazione manager diretti e area manager ai reparti.

────────────────────────────────────────────
19. BASKET (/basket), SCADENZE (/scadenze), REPORT (/report), AUDIT (/audit)
────────────────────────────────────────────
Basket: Riepilogo assenze pianificate nel mese.
Scadenze: Monitoraggio contratti in scadenza con urgenza (critico ≤30gg, in scadenza 31-90gg).
Report e Audit: Pagine di reportistica e tracciamento.

════════════════════════════════════════════
RUOLI UTENTE
════════════════════════════════════════════
- HR Admin: accesso completo a tutte le funzionalità
- Manager: Dashboard, Dipendenti reparto, Presenze reparto, Anomalie, Approvazioni
- Area Manager: come Manager ma per più reparti + Report
- Dipendente: Dashboard personale, Richieste, Saldo ferie, Scadenze personali, Cedolini, Profilo

════════════════════════════════════════════
GLOSSARIO TERMINI
════════════════════════════════════════════
- BOP (Banca Ore Presenze): salvadanaio personale ore extra infrasettimanali
- BOA (Banca Ore Assenza): ore sabato/festivi accumulate
- BOS (Banca Ore Straordinario): straordinario accumulato in banca ore (non pagato)
- BOB: eccedenza ore oltre 48h settimanali
- Supplementare: ore lavorate da part-time tra contratto e 40h
- Straordinario: ore oltre 40h (max 8h/settimana pagabili, max 2h/giorno)
- ROL: Riduzione Orario di Lavoro (permessi orari da contratto)
- Causale: tipologia di assenza/permesso (es. ferie, malattia, permesso)
- Matricola: codice identificativo del dipendente
- Pipeline: sequenza ordinata di regole per allocare ore in eccesso o deficit
- Template orario: schema settimanale con possibile rotazione multi-settimana
`;

export const CCNL_KNOWLEDGE = `
════════════════════════════════════════════
CCNL METALMECCANICI INDUSTRIA — INFORMAZIONI VERIFICATE
════════════════════════════════════════════

ATTENZIONE: Le informazioni seguenti sono di carattere generale.
Per casi specifici consultare SEMPRE il testo contrattuale aggiornato e/o il consulente del lavoro.

ORARIO DI LAVORO:
- Orario settimanale: 40 ore (per full-time)
- Distribuzione: normalmente su 5 giorni (lunedì-venerdì)
- È possibile la distribuzione su 6 giorni

STRAORDINARIO:
- Limite massimo: 8 ore settimanali, 2 ore giornaliere
- Limite annuo: 200 ore (elevabili con accordo sindacale a 250)
- Maggiorazione straordinario feriale: 25%
- Maggiorazione straordinario festivo: 50%
- Maggiorazione straordinario notturno: 50%
- Maggiorazione straordinario notturno festivo: 75%

FERIE:
- Spettanza annua: 4 settimane (160 ore per full-time)
- Godimento: minimo 2 settimane consecutive nel periodo estivo (giugno-settembre)
- Le restanti 2 settimane entro 18 mesi dalla fine dell'anno di maturazione

ROL (Riduzione Orario di Lavoro):
- Ore annue: dipende dall'anzianità e dalla dimensione dell'azienda
- Per aziende > 15 dipendenti: fino a 72 ore annue (a regime)
- Per aziende ≤ 15 dipendenti: fino a 36 ore annue
- ROL non godute: liquidabili o fruibili entro il 30 giugno dell'anno successivo

LAVORO SUPPLEMENTARE (Part-Time):
- Sono le ore lavorate oltre l'orario contrattuale part-time e fino a 40h settimanali
- Maggiorazione: 15%

PERIODO DI PROVA:
- Operai: 1-3 mesi (a seconda del livello)
- Impiegati: 1-6 mesi (a seconda del livello)

CONTRATTI A TERMINE:
- Durata massima: 24 mesi (comprensivi di proroghe e rinnovi)
- Dopo 12 mesi è obbligatoria una causale giustificativa
- Tra un contratto e il successivo: pausa minima 10-20 giorni

MALATTIA:
- Periodo di comporto: 12 mesi in un arco di 3 anni (per anzianità > 3 anni)
- Primi 3 giorni (carenza): a carico dell'azienda al 100%
- Dal 4° al 20° giorno: INPS 50% + integrazione aziendale
- Dal 21° al 180° giorno: INPS 66,66% + integrazione aziendale

════════════════════════════════════════════
INPS — INFORMAZIONI GENERALI
════════════════════════════════════════════

CONTRIBUTI:
- I contributi previdenziali sono a carico sia del datore di lavoro che del dipendente
- Aliquota dipendente: circa 9,19% della retribuzione imponibile
- Il datore di lavoro versa la propria quota + quella del dipendente tramite modello F24

MALATTIA (INPS):
- L'indennità INPS decorre dal 4° giorno di malattia
- I primi 3 giorni sono il "periodo di carenza" a carico dell'azienda
- Dal 4° al 20° giorno: 50% della retribuzione media giornaliera
- Dal 21° al 180° giorno: 66,66%
- Il datore di lavoro anticipa l'indennità in busta paga e la recupera con il modello F24

MATERNITÀ:
- Congedo obbligatorio: 5 mesi (2 prima + 3 dopo il parto, oppure 1+4 o 0+5 con certificato)
- Indennità: 80% della retribuzione (a carico INPS, anticipata dal datore)
- Congedo parentale: fino a 10 mesi complessivi (elevabili a 11 se il padre ne fruisce almeno 3)

NASPI (Disoccupazione):
- Requisiti: 13 settimane di contributi negli ultimi 4 anni + 30 giorni di lavoro effettivo negli ultimi 12 mesi
- Importo: 75% della retribuzione media (fino a un massimale) per i primi 6 mesi, poi decresce del 3% mensile
- Durata: pari alla metà delle settimane contributive degli ultimi 4 anni (max 24 mesi)
`;
