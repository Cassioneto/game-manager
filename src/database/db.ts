import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb() {
  if (!db) {
    db = SQLite.openDatabaseSync('gamemanager.db');
    // WAL improves crash-resilience and read/write concurrency; a busy_timeout
    // avoids spurious "database is locked" errors when two writes overlap.
    db.execSync('PRAGMA journal_mode = WAL;');
    db.execSync('PRAGMA busy_timeout = 3000;');
    db.execSync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

// ==========================================
// SCHEMA (fresh installs)
// ==========================================
// NOTE: `CREATE TABLE IF NOT EXISTS` only runs the CREATE the very first time a
// device sees this database file. On every app update after that it is a no-op,
// so any column added here later never reaches devices that already have the
// table. Real schema changes for upgrades must go through the versioned
// migrations below (see `runMigrations`), which use PRAGMA user_version to
// track what has already been applied to a given device's database.
function createBaseSchema(database: SQLite.SQLiteDatabase) {
  database.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      perfil TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL,
      nome TEXT NOT NULL,
      setor TEXT,
      descricao TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT,
      tipo_pagamento TEXT NOT NULL DEFAULT 'tempo'
    );

    CREATE TABLE IF NOT EXISTS price_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      duracao_minutos INTEGER,
      preco REAL NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'tempo',
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      operador_id INTEGER,
      inicio INTEGER NOT NULL,
      fim_previsto INTEGER,
      fim_real INTEGER,
      duracao_minutos INTEGER,
      valor_cobrado REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ativa',
      tipo_pagamento TEXT NOT NULL DEFAULT 'tempo',
      cash_register_id INTEGER,
      FOREIGN KEY (machine_id) REFERENCES machines(id),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id)
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_abertura INTEGER NOT NULL,
      data_fecho INTEGER,
      responsavel_abertura INTEGER,
      responsavel_fecho INTEGER,
      valor_inicial REAL NOT NULL DEFAULT 0,
      valor_contado_final REAL,
      valor_esperado_final REAL,
      diferenca REAL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_register_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      motivo TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT,
      preco REAL NOT NULL,
      estoque_atual INTEGER NOT NULL,
      estoque_minimo INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      valor_total REAL NOT NULL,
      session_id INTEGER,
      cash_register_id INTEGER,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id)
    );

    CREATE TABLE IF NOT EXISTS maintenances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      atividade TEXT NOT NULL,
      agendado_para INTEGER NOT NULL,
      concluido_em INTEGER,
      responsavel_id INTEGER,
      observacoes TEXT,
      status TEXT NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id)
    );

    CREATE TABLE IF NOT EXISTS cleanings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area TEXT NOT NULL,
      checklist_item_id INTEGER,
      frequencia TEXT NOT NULL,
      agendado_para INTEGER NOT NULL,
      concluido_em INTEGER,
      responsavel_id INTEGER,
      foto_evidencia TEXT,
      FOREIGN KEY (checklist_item_id) REFERENCES cleaning_checklist_items(id)
    );

    CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      area TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      contacto TEXT,
      data_nascimento INTEGER,
      pontos_saldo INTEGER DEFAULT 0,
      criado_em INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      pontos INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      origem TEXT NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      machine_id INTEGER,
      game_id INTEGER NOT NULL,
      horario_reservado INTEGER NOT NULL,
      janela_bloqueio_min INTEGER NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (machine_id) REFERENCES machines(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS happy_hour_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      duracao_minutos INTEGER NOT NULL,
      preco_promo REAL NOT NULL,
      ativo INTEGER DEFAULT 1,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      data_hora INTEGER NOT NULL,
      vagas_maximas INTEGER NOT NULL,
      vagas_ocupadas INTEGER DEFAULT 0,
      taxa_inscricao REAL NOT NULL,
      premio TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      posicao INTEGER,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      data_hora INTEGER NOT NULL,
      status TEXT NOT NULL,
      destino TEXT NOT NULL
    );
  `);
}

// ==========================================
// MIGRATIONS (upgrades on devices that already have a database)
// ==========================================
// Each entry runs at most once per device, tracked via PRAGMA user_version.
// Migrations must be additive/idempotent-safe (checked via columnExists)
// because they also run once, harmlessly, right after createBaseSchema() on a
// brand-new install where the columns already exist.
function columnExists(database: SQLite.SQLiteDatabase, table: string, column: string): boolean {
  const rows = database.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
}

type Migration = { version: number; run: (database: SQLite.SQLiteDatabase) => void };

const MIGRATIONS: Migration[] = [
  {
    // Adds "descricao" (free-text notes) to machines. Without this, editing
    // the "Descrição" field in Configurações > Máquinas throws a SQLite
    // "no such column" error on every keystroke.
    version: 1,
    run: (database) => {
      if (!columnExists(database, 'machines', 'descricao')) {
        database.execSync('ALTER TABLE machines ADD COLUMN descricao TEXT;');
      }
    },
  },
  {
    // Persists the payment type ("jogo" vs "tempo") chosen when a session is
    // started. Previously this was *inferred* from duracao_minutos === 0,
    // which is ambiguous: both "por jogo" sessions and "tempo livre" sessions
    // start with duracao_minutos = 0. That made active "tempo livre" sessions
    // reopen as "por jogo" from the Dashboard/Machines map after navigating
    // away or restarting the app, breaking the timer and the final charge.
    version: 2,
    run: (database) => {
      if (!columnExists(database, 'sessions', 'tipo_pagamento')) {
        database.execSync("ALTER TABLE sessions ADD COLUMN tipo_pagamento TEXT NOT NULL DEFAULT 'tempo';");
        // Best-effort backfill for rows created before this column existed,
        // using the same heuristic the app used to rely on.
        database.execSync(
          "UPDATE sessions SET tipo_pagamento = CASE WHEN duracao_minutos = 0 THEN 'jogo' ELSE 'tempo' END;"
        );
      }
    },
  },
  {
    // Drops the PIN column now that in-app PIN/user authentication has been
    // removed (single-operator app). Best-effort: if the installed SQLite
    // build doesn't support DROP COLUMN, the column is simply left unused —
    // it is never read or written anywhere in the app.
    version: 3,
    run: (database) => {
      if (columnExists(database, 'users', 'pin')) {
        try {
          database.execSync('ALTER TABLE users DROP COLUMN pin;');
        } catch (e) {
          console.warn('Could not drop legacy users.pin column (safe to ignore):', e);
        }
      }
    },
  },
];

function runMigrations(database: SQLite.SQLiteDatabase) {
  const result = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;
  const targetVersion = MIGRATIONS.length;

  if (currentVersion >= targetVersion) return;

  database.withTransactionSync(() => {
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        migration.run(database);
        currentVersion = migration.version;
      }
    }
    database.execSync(`PRAGMA user_version = ${targetVersion};`);
  });
}

export async function initializeDatabase() {
  const database = getDb();
  createBaseSchema(database);
  runMigrations(database);
  return database;
}
