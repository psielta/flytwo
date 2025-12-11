import { useState, useEffect, useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initDatabase, getDatabase, closeDatabase } from './database';

interface UseDatabaseReturn {
  db: SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
  reset: () => Promise<void>;
}

/**
 * Hook para acessar o banco de dados SQLite.
 * Inicializa o banco automaticamente na primeira renderização.
 */
export function useDatabase(): UseDatabaseReturn {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const database = await initDatabase();
        if (mounted) {
          setDb(database);
          setIsReady(true);
        }
      } catch (err) {
        console.error('[useDatabase] Erro ao inicializar banco:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Erro desconhecido'));
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const reset = useCallback(async () => {
    setIsReady(false);
    setError(null);
    await closeDatabase();
    const database = await initDatabase();
    setDb(database);
    setIsReady(true);
  }, []);

  return { db, isReady, error, reset };
}

/**
 * Hook simplificado para obter apenas a instância do banco.
 * Útil quando o banco já foi inicializado pelo DatabaseProvider.
 */
export function useDatabaseInstance(): SQLiteDatabase | null {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  return db;
}
