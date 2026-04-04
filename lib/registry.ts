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
  private readonly HIVE_PATH = "C:/Windows/System32/config/SYSTEM.reg";

  async init() {
    if (this.isInitialized) return;
    
    // Ensure VFS is ready first so we can access C:
    await vfs.init();
    
    // Create system directory if it doesn't exist
    if (!(await vfs.exists("C:/Windows/System32/config"))) {
      await vfs.mkdir("C:/Windows/System32/config");
    }

    this.isInitialized = true;
    console.log("Registry: Initialized on Internal Storage.");
  }

  async get<T>(path: string, defaultValue: T): Promise<T> {
    try {
      const hive = await this.loadHive();
      return hive[path] !== undefined ? (hive[path] as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async set(path: string, value: RegistryValue): Promise<void> {
    const hive = await this.loadHive();
    hive[path] = value;
    await this.saveHive(hive);
    
    window.dispatchEvent(new CustomEvent('reg-update', { detail: { path, value } }));
  }

  async getAll(): Promise<Record<string, RegistryValue>> {
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