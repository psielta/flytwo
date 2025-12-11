/**
 * Database module exports
 * Centraliza todas as funcionalidades de banco de dados SQLite
 */

// Database connection and initialization
export {
  getDatabase,
  initDatabase,
  closeDatabase,
  resetDatabase,
} from './database';

// Migrations
export {
  MIGRATIONS,
  getCurrentVersion,
  runMigrations,
  type Migration,
} from './migrations';

// Hooks
export { useDatabase, useDatabaseInstance } from './useDatabase';
