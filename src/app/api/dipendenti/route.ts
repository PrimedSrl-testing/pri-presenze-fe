import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/dipendenti — list all dipendenti with LEFT JOIN to config
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        d.id, d.matricola, d.nome, d.des_reparto, d.des_contratto,
        d.data_inizio, d.data_fine, d.des_programma, d.ore_settimanali,
        d.id_reparto, d.id_contratto, d.id_mansione, d.id_programma,
        c.id            AS cfg_id,
        c.pausa_minuti,
        c.pausa_soglia_ore,
        c.pausa_auto,
        c.flg_bop,
        c.flg_boa,
        c.flg_bos,
        c.tipo_assunzione,
        c.stagionale_gia_censito,
        c.kronos_badge,
        c.kronos_attivo,
        c.data_ins      AS cfg_data_ins,
        c.data_mod      AS cfg_data_mod
      FROM CFXX_HR_ANAG_DIP d
      LEFT JOIN CFXX_HR_DIP_CONFIG c ON c.dip_id = d.id
      ORDER BY d.nome
    `);

    const rows = result.recordset.map((r: any) => ({
      id: r.id,
      matricola: r.matricola,
      nome: r.nome,
      des_reparto: r.des_reparto,
      des_contratto: r.des_contratto,
      data_inizio: r.data_inizio,
      data_fine: r.data_fine,
      des_programma: r.des_programma,
      ore_settimanali: r.ore_settimanali,
      id_reparto: r.id_reparto,
      id_contratto: r.id_contratto,
      id_mansione: r.id_mansione,
      id_programma: r.id_programma,
      config: r.cfg_id != null
        ? {
            id: r.cfg_id,
            dip_id: r.id,
            pausa_minuti: r.pausa_minuti,
            pausa_soglia_ore: r.pausa_soglia_ore,
            pausa_auto: !!r.pausa_auto,
            flg_bop: !!r.flg_bop,
            flg_boa: !!r.flg_boa,
            flg_bos: !!r.flg_bos,
            tipo_assunzione: r.tipo_assunzione,
            stagionale_gia_censito: !!r.stagionale_gia_censito,
            kronos_badge: r.kronos_badge,
            kronos_attivo: !!r.kronos_attivo,
          }
        : null,
    }));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/dipendenti — crea nuovo dipendente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, matricola, des_reparto, des_contratto, data_inizio, data_fine, ore_settimanali, des_programma } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 });
    }

    const pool = await getPool();

    // Genera matricola se non fornita
    let mat = matricola;
    if (!mat) {
      const maxRes = await pool.request().query(
        `SELECT TOP 1 matricola FROM CFXX_HR_ANAG_DIP ORDER BY id DESC`
      );
      const lastMat = maxRes.recordset[0]?.matricola ?? '0000000000';
      const nextNum = (parseInt(lastMat.replace(/\D/g, '') || '0', 10) + 1);
      mat = String(nextNum).padStart(10, '0');
    }

    const result = await pool
      .request()
      .input('nome', sql.NVarChar(255), nome)
      .input('matricola', sql.NVarChar(255), mat)
      .input('des_reparto', sql.NVarChar(255), des_reparto ?? null)
      .input('des_contratto', sql.NVarChar(255), des_contratto ?? null)
      .input('data_inizio', sql.DateTime, data_inizio ?? null)
      .input('data_fine', sql.DateTime, data_fine ?? null)
      .input('ore_settimanali', sql.Float, ore_settimanali ?? 40)
      .input('des_programma', sql.NVarChar(255), des_programma ?? null)
      .query(`
        INSERT INTO CFXX_HR_ANAG_DIP
          (nome, matricola, des_reparto, des_contratto, data_inizio, data_fine, ore_settimanali, des_programma)
        OUTPUT INSERTED.*
        VALUES
          (@nome, @matricola, @des_reparto, @des_contratto, @data_inizio, @data_fine, @ore_settimanali, @des_programma)
      `);

    const r = result.recordset[0];
    return NextResponse.json({ id: r.id, nome: r.nome, matricola: r.matricola }, { status: 201 });
  } catch (err: any) {
    console.error('[API] POST /api/dipendenti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
