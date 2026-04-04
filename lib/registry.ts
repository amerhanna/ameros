"use client"

import { vfs } from "./vfs";

/**
 * AmerOS Registry - System Configuration Store
 * Lives on C:/Windows/System32/config/
 */

export type RegistryValue = string | number | boolean | object;

export interface RegistryEntry {
  path: string; // e.g., "HKEY_LOCAL_MACHINE/Software/Mounts"
  value: RegistryValue;
  lastModified: number;
}

class Registry {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly SYSTEM_DIR = "C:/Windows/System32/config";
  private readonly HIVE_PATH = "C:/Windows/System32/config/SYSTEM.reg";

  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await vfs.init();

      try {
        const exists = await vfs.exists(this.SYSTEM_DIR);
        if (!exists) {
          await vfs.mkdir(this.SYSTEM_DIR);
        }

        const verified = await vfs.exists(this.SYSTEM_DIR);
        if (!verified) {
          throw new Error(`Registry system directory could not be verified or created: ${this.SYSTEM_DIR}`);
        }

        this.isInitialized = true;
        console.log("Registry: Initialized on Internal Storage.");
      } catch (error) {
        this.initPromise = null;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Registry init failed: ${message}`);
      }
    })();

    return this.initPromise;
  }

  private async ensureInitialized() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    return this.init();
  }

  async get<T>(path: string, defaultValue: T): Promise<T> {
    await this.ensureInitialized();
    try {
      const hive = await this.loadHive();
      return hive[path] !== undefined ? (hive[path] as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async set(path: string, value: RegistryValue): Promise<void> {
    await this.ensureInitialized();
    const hive = await this.loadHive();
    hive[path] = value;
    await this.saveHive(hive);
    
    window.dispatchEvent(new CustomEvent('reg-update', { detail: { path, value } }));
  }

  async getAll(): Promise<Record<string, RegistryValue>> {
    await this.ensureInitialized();
    return await this.loadHive();
  }

  private async loadHive(): Promise<Record<string, RegistryValue>> {
    try {
      if (!(await vfs.exists(this.HIVE_PATH))) return {};
      const content = await vfs.readFile(this.HIVE_PATH);
      const text = typeof content === 'string' ? content : await (content as Blob).text();
      return JSON.parse(text);
    } catch (e) {
      console.error("Registry: Hive corrupted. AmerOS may fail to boot.", e);
      return {};
    }
  }

  private async saveHive(data: Record<string, RegistryValue>): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await vfs.writeFile(this.HIVE_PATH, content);
  }

  /** Groundwork for Setup/Recovery: Wipes the system hive */
  async factoryReset() {
    await vfs.delete(this.HIVE_PATH);
    window.location.reload();
  }
}

export const registry = new Registry();