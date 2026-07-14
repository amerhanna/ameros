'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbService } from '@/lib/database';

/**
 * Resolves an OS Database context bound to a shared namespace, not tied to any
 * specific application. Multiple apps can connect to the same shared database
 * by supplying the same `sharedName`.
 *
 * Unlike `useDatabase`, this hook does NOT require a WindowContext — it is safe
 * to call from system-level components, daemons, or any app that needs
 * cross-app data sharing.
 *
 * @param dbName The name of the database to open (e.g. 'ecommerce', 'userSettings').
 * @param sharedName Optional shared namespace that scopes where the DB is stored in the VFS (defaults to 'shared').
 * @returns Object providing:
 * - `query(sql, params)`: Async function to execute AlaSQL statements. Mutations auto-sync to VFS.
 * - `isReady`: Boolean flag if the DB connection is fully established.
 * - `error`: Rejection string or null if successful.
 */
export function useSharedDatabase(dbName: string, sharedName: string = 'shared') {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initDb = async () => {
      try {
        await dbService.connect(sharedName, dbName);
        if (mounted) setIsReady(true);
      } catch (err: any) {
        if (mounted) setError(err.message);
      }
    };

    initDb();

    return () => {
      mounted = false;
    };
  }, [sharedName, dbName]);

  const query = useCallback(async (sql: string, params: any[] = []) => {
    if (!isReady) throw new Error('Database is not ready yet.');
    return await dbService.query(sharedName, sql, params, dbName);
  }, [isReady, sharedName, dbName]);

  return { query, isReady, error };
}
