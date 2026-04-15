// @ts-ignore
import alasql from 'alasql';
import { vfs } from './vfs';

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
