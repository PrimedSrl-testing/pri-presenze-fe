import sql from 'mssql';

const config: sql.config = {
  server: 'MSSQL',
  database: 'PRIMED',
  user: 'primedsa',
  password: 'Primed123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        pool.on('error', (err) => {
          console.error('[MSSQL] Pool error:', err);
          poolPromise = null;
        });
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise!;
}

export async function query<T = any>(q: string): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.request().query(q);
  return result.recordset as T[];
}

export async function queryOne<T = any>(q: string): Promise<T | null> {
  const rows = await query<T>(q);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(q: string): Promise<void> {
  const pool = await getPool();
  await pool.request().query(q);
}

export { sql };
