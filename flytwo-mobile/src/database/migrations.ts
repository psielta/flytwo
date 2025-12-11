import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  up: string;
  description?: string;
}

/**
 * Lista de migrations do banco de dados.
 * Adicione novas migrations ao final do array com version incrementado.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Criar tabela de controle de migrations',
    up: `
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  // Exemplo de migration futura:
  // {
  //   version: 2,
  //   description: 'Criar tabela de cache de produtos',
  //   up: `
  //     CREATE TABLE IF NOT EXISTS cached_products (
  //       id TEXT PRIMARY KEY,
  //       data TEXT NOT NULL,
  //       synced_at TEXT,
  //       created_at TEXT DEFAULT CURRENT_TIMESTAMP
  //     );
  //   `,
  // },
];

/**
 * Obtém a versão atual do banco de dados
 */
export async function getCurrentVersion(db: SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM _migrations'
    );
    return result?.version ?? 0;
  } catch {
    // Tabela ainda não existe
    return 0;
  }
}

/**
 * Executa as migrations pendentes
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentVersion(db);

  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('[Database] Banco de dados já está atualizado (versão', currentVersion, ')');
    return;
  }

  console.log('[Database] Executando', pendingMigrations.length, 'migration(s)...');

  for (const migration of pendingMigrations) {
    console.log('[Database] Aplicando migration', migration.version, '-', migration.description);

    await db.execAsync(migration.up);

    // Registrar migration aplicada
    await db.runAsync(
      'INSERT INTO _migrations (version, description) VALUES (?, ?)',
      migration.version,
      migration.description ?? null
    );
  }

  console.log('[Database] Migrations concluídas. Versão atual:', pendingMigrations[pendingMigrations.length - 1].version);
}
