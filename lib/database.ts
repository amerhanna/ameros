// @ts-ignore
import alasql from 'alasql';
import { vfs } from './vfs';

/**
 * OS Database Engine powered by AlaSQL.
 * Provides a synchronous, in-memory SQL execution context that is automatically 
 * serialized and synchronized to the Virtual File System (C:/System/AppData).
 */
class DatabaseService {
  private static instance: DatabaseService;
  private connectionPromises: Record<string, Promise<void>> = {};

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initializes and connects to a localized database file within the given app's dataset.
   * If the database does not exist in the VFS, it creates a fresh in-memory AlaSQL instance.
   * Concurrent calls to connect identically resolve securely via `connectionPromises`.
   *
   * @param appName The unique ID of the application requesting connection (e.g., 'Notes').
   * @param dbName Optional localized DB namespace, defaults to 'main'.
   */
  public async connect(appName: string, dbName: string = 'main'): Promise<void> {
    const dbId = `${appName}_${dbName}`;
    
    // Deduplicate concurrent connection attempts
    if (!this.connectionPromises[dbId]) {
      this.connectionPromises[dbId] = (async () => {
        // Use /System/AppData for system level persistence
        const vfsPath = `C:/System/AppData/${appName}/${dbName}.db.json`;
        
        // Create the database in AlaSQL (only if it doesn't exist)
        if (!alasql.databases[dbId]) {
          alasql(`CREATE DATABASE ${dbId}`);
        }
        
        try {
          // Attempt to load from VFS
          const blob = await vfs.readFile(vfsPath) as Blob;
          if (blob) {
            const text = await blob.text();
            if (text) {
              const tables = JSON.parse(text);
              // Set the tables directly into AlaSQL
              alasql.databases[dbId].tables = tables;
            }
          }
        } catch (error) {
          console.log(`[DatabaseService] No existing database found for ${dbId}, starting fresh.`);
        }
      })();
    }

    return this.connectionPromises[dbId];
  }

  /**
   * Safely executes an SQL query or mutation.
   * Modifying queries (INSERT|UPDATE|DELETE etc.) are automatically captured and persist 
   * exactly to the VFS to preserve state safely.
   *
   * @param appName Bound application context ID preventing cross-app data leakage.
   * @param sql The raw SQL execution string.
   * @param params Optional array of parameter bindings used over `?` syntax in AlaSQL.
   * @param dbName Target database subset to execute upon.
   * @returns Resolves with the executed execution result/rows.
   */
  public async query(appName: string, sql: string, params: any[] = [], dbName: string = 'main'): Promise<any> {
    const dbId = `${appName}_${dbName}`;
    await this.connect(appName, dbName);

    alasql(`USE ${dbId}`);
    const result = alasql(sql, params);

    // If it's a mutation query, save the state to VFS
    const isMutation = /^(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql.trim());
    if (isMutation) {
      await this.persistToVFS(appName, dbName, dbId);
    }

    return result;
  }

  private async persistToVFS(appName: string, dbName: string, dbId: string): Promise<void> {
    const vfsDir = `C:/System/AppData/${appName}`;
    const vfsPath = `${vfsDir}/${dbName}.db.json`;
    
    // Ensure the directory exists
    if (!(await vfs.exists(vfsDir))) {
      await vfs.mkdir(vfsDir);
    }
    
    const dbState = JSON.stringify(alasql.databases[dbId].tables);
    await vfs.writeFile(vfsPath, dbState);
  }

  public createDaemonClient(daemonName: string, dbName: string = 'main') {
    return {
      query: async (sql: string, params: any[] = []) => {
        return await this.query(daemonName, sql, params, dbName);
      }
    };
  }
}

export const dbService = DatabaseService.getInstance();
