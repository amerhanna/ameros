'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { dbService } from '@/lib/database';
import { WindowContext } from '@/components/WindowManager/WindowContext';

export function useDatabase(dbName: string = 'main') {
  const windowContext = useContext(WindowContext);
  
  // Enforce zero-trust spoofing
  if (!windowContext || !windowContext.appId) {
    throw new Error("SECURITY VIOLATION: useDatabase must be called within an OS Window.");
  }

  const appId = windowContext.appId;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initDb = async () => {
      try {
        await dbService.connect(appId, dbName);
        if (mounted) setIsReady(true);
      } catch (err: any) {
        if (mounted) setError(err.message);
      }
    };

    initDb();

    return () => {
      mounted = false;
    };
  }, [appId, dbName]);

  const query = useCallback(async (sql: string, params: any[] = []) => {
    if (!isReady) throw new Error('Database is not ready yet.');
    return await dbService.query(appId, sql, params, dbName);
  }, [isReady, appId, dbName]);

  return { query, isReady, error };
}
