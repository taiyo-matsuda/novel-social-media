// テスト用の D1。Node 標準の SQLite（node:sqlite）で D1 と同じ形の API を作り、マイグレーションを流し込む
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

// D1 と同じく、真偽値は 1/0、undefined は null として保存する
function toSqlite(value: unknown): SQLInputValue {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value as SQLInputValue;
}

class FakeStatement {
  private params: SQLInputValue[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.params = values.map(toSqlite);
    return this;
  }

  async all<T>() {
    const rows = this.db.prepare(this.sql).all(...this.params) as T[];
    const meta = this.db
      .prepare(
        "select changes() as changes, last_insert_rowid() as last_row_id",
      )
      .get() as { changes: number; last_row_id: number };
    return { results: rows, success: true, meta };
  }

  async run() {
    return this.all();
  }

  async first<T>(column?: string) {
    const row = this.db.prepare(this.sql).get(...this.params) as
      Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async raw<T>() {
    const rows = this.db.prepare(this.sql).all(...this.params);
    return rows.map((r) => Object.values(r)) as T[];
  }
}

export function createFakeD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec("pragma foreign_keys = on");
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  const fake = {
    prepare: (sql: string) => new FakeStatement(db, sql),
    batch: async (statements: FakeStatement[]) =>
      Promise.all(statements.map((s) => s.all())),
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
  return fake as unknown as D1Database;
}
