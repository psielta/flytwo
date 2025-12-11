import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'flytwo.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Obtém a instância do banco de dados.
 * Reutiliza a conexão existente se já estiver aberta.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbInstance;
}

/**
 * Inicializa o banco de dados.
 * Configura pragmas e executa migrations pendentes.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDatabase();

  // Configurações de performance e integridade
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
  `);

  // Executar migrations
  await runMigrations(db);

  console.log('[Database] Banco de dados inicializado com sucesso');

  return db;
}

/**
 * Fecha a conexão com o banco de dados.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    console.log('[Database] Conexão fechada');
  }
}

/**
 * Reseta o banco de dados (útil para desenvolvimento/testes).
 * CUIDADO: Remove todos os dados!
 */
export async function resetDatabase(): Promise<void> {
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  console.log('[Database] Banco de dados removido');
}
