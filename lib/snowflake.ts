import snowflake from "snowflake-sdk";

snowflake.configure({ logLevel: "ERROR" });

let conn: snowflake.Connection | null = null;

async function getConnection(): Promise<snowflake.Connection> {
  if (conn && conn.isUp()) return conn;
  const privateKey = Buffer.from(process.env.SNOWFLAKE_PRIVATE_KEY_B64!, "base64").toString("utf8");
  conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    authenticator: "SNOWFLAKE_JWT",
    privateKey,
    role: process.env.SNOWFLAKE_ROLE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
  });
  await new Promise<void>((resolve, reject) =>
    conn!.connect((err) => (err ? reject(err) : resolve()))
  );
  return conn;
}

function run<T>(c: snowflake.Connection, sqlText: string, binds: snowflake.Binds): Promise<T[]> {
  return new Promise((resolve, reject) => {
    c.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])),
    });
  });
}

/** Runs a query. On a dropped connection, reconnects and retries once. SQL errors are not retried. */
export async function query<T = Record<string, unknown>>(
  sqlText: string,
  binds: snowflake.Binds = []
): Promise<T[]> {
  try {
    return await run<T>(await getConnection(), sqlText, binds);
  } catch (err) {
    const sqlState = (err as { sqlState?: string }).sqlState ?? "";
    if (sqlState.startsWith("42")) throw err; // compilation / access error: retrying won't help
    console.warn("[snowflake] retrying after error:", (err as Error).message);
    conn = null;
    return run<T>(await getConnection(), sqlText, binds);
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}
