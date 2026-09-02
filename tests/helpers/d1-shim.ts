/**
 * D1Database shim backed by better-sqlite3.
 *
 * Drizzle's d1 adapter calls:
 *   client.prepare(sql)                → PreparedStatement
 *   stmt.bind(...params)               → BoundStatement
 *   boundStmt.run()                    → Promise<{ results, success, meta }>
 *   boundStmt.all()                    → Promise<{ results: object[] }>
 *   boundStmt.raw()                    → Promise<unknown[][]>
 *   client.batch([boundStmt, ...])     → Promise<{ results, success, meta }[]>
 *   client.exec(sql)                   → Promise<{ count, duration }>
 *
 * All methods return Promises to match the real D1 interface even though
 * better-sqlite3 is synchronous underneath.
 */

import Database from 'better-sqlite3';

type BsqliteStmt = ReturnType<InstanceType<typeof Database>['prepare']>;

interface D1Result {
  results: Record<string, unknown>[];
  success: boolean;
  meta: Record<string, unknown>;
}

export class BoundStatement {
  readonly stmt: BsqliteStmt;
  readonly params: unknown[];

  constructor(stmt: BsqliteStmt, params: unknown[]) {
    this.stmt = stmt;
    this.params = params;
  }

  async run(): Promise<D1Result> {
    const info = this.stmt.run(...this.params);
    return {
      results: [],
      success: true,
      meta: { changes: info.changes, lastRowid: info.lastInsertRowid },
    };
  }

  async all(): Promise<{ results: Record<string, unknown>[] }> {
    const rows = this.stmt.all(...this.params) as Record<string, unknown>[];
    return { results: rows };
  }

  async raw(): Promise<unknown[][]> {
    return this.stmt.raw().all(...this.params) as unknown[][];
  }

  /** Synchronous run used inside db.batch() transactions. */
  runSync(): D1Result {
    if (this.stmt.reader) {
      return {
        results: this.stmt.all(...this.params) as Record<string, unknown>[],
        success: true,
        meta: {},
      };
    }
    const info = this.stmt.run(...this.params);
    return {
      results: [],
      success: true,
      meta: { changes: info.changes, lastRowid: info.lastInsertRowid },
    };
  }
}

class PreparedStatement {
  constructor(private readonly stmt: BsqliteStmt) {}

  bind(...params: unknown[]): BoundStatement {
    return new BoundStatement(this.stmt, params);
  }
}

export class D1Shim {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.db.prepare(sql));
  }

  async batch(statements: BoundStatement[]): Promise<D1Result[]> {
    let results: D1Result[] = [];
    this.db.transaction(() => {
      results = statements.map((s) => s.runSync());
    })();
    return results;
  }

  async exec(sql: string): Promise<{ count: number; duration: number }> {
    const start = Date.now();
    this.db.exec(sql);
    return { count: 0, duration: Date.now() - start };
  }
}
