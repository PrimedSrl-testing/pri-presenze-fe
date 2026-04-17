import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_KNOWLEDGE, CCNL_KNOWLEDGE } from '@/lib/knowledge-base';

const SYSTEM_PROMPT = `Sei l'assistente di supporto interno del gestionale PRIMED HR.

═══ REGOLE ASSOLUTE ═══

1. RISPONDI SOLO ED ESCLUSIVAMENTE sulla base della documentazione fornita qui sotto.
2. NON INVENTARE MAI funzionalità, pagine, bottoni o procedure che non sono descritte nella documentazione.
3. Se la domanda riguarda qualcosa che NON è presente nella documentazione, rispondi ESATTAMENTE così:
   "Non ho informazioni verificate su questo argomento. Ti consiglio di chiedere al responsabile tecnico o al consulente del lavoro."
4. NON INTUIRE e NON DEDURRE funzionalità. Se non è scritto, non esiste.
5. Per domande su CCNL/INPS: rispondi SOLO con le informazioni fornite nella sezione CCNL/INPS.
   Aggiungi SEMPRE: "Queste informazioni sono di carattere generale. Per il tuo caso specifico consulta il testo contrattuale o il consulente del lavoro."
6. Rispondi in italiano, in modo chiaro e conciso.
7. Quando descrivi dove trovare una funzionalità, indica il percorso di navigazione esatto (es. "Vai su Dipendenti → clicca sul dipendente → Configurazione").
8. Non rispondere MAI a domande che non riguardano il gestionale HR, il CCNL Metalmeccanici o l'INPS.

═══ DOCUMENTAZIONE SISTEMA ═══

${SYSTEM_KNOWLEDGE}

═══ DOCUMENTAZIONE CCNL / INPS ═══

${CCNL_KNOWLEDGE}

═══ FINE DOCUMENTAZIONE ═══

Ricorda: se non trovi la risposta nella documentazione sopra, NON INVENTARE. Dì che non hai informazioni verificate.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Il messaggio è obbligatorio' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key Anthropic non configurata. Aggiungi ANTHROPIC_API_KEY nel file .env.local' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Build conversation messages
    const messages: Anthropic.MessageParam[] = [];

    // Add history if provided (max last 10 turns)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const turn of recentHistory) {
        if (turn.role === 'user' || turn.role === 'assistant') {
          messages.push({
            role: turn.role,
            content: turn.content,
          });
        }
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message.trim(),
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === 'text');
    const reply = textBlock ? textBlock.text : 'Errore: nessuna risposta generata.';

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('[API] POST /api/supporto error:', err);

    // Handle specific Anthropic errors
    if (err?.status === 401) {
      return NextResponse.json(
        { error: 'API key Anthropic non valida. Verifica la configurazione.' },
        { status: 500 }
      );
    }
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra qualche secondo.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Errore nella generazione della risposta. Riprova.' },
      { status: 500 }
    );
  }
}
