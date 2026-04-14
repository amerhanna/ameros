"use client"

import { vfs } from "./vfs";
import defaultRegistryHive from "./default-registry.json";

/**
 * AmerOS Registry - System Configuration Store
 * Lives on C:/Windows/System32/config/
 */

export type RegistryValue = string | number | boolean | object | null;
export type RegistryValueType = 'string' | 'number' | 'boolean' | 'object';

export interface RegistryKeyNode {
  name: string;
  type: 'key';
  content: RegistryNode[];
}

export interface RegistryValueNode {
  name: string;
  type: RegistryValueType;
  content: RegistryValue;
}

export type RegistryNode = RegistryKeyNode | RegistryValueNode;



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
      const hive = await this.loadHiveFlat();
      return hive[path] !== undefined ? (hive[path] as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async set(path: string, value: RegistryValue): Promise<void> {
    await this.ensureInitialized();
    const rawHive = await this.loadHiveRaw();
    this.setValueNode(rawHive, path, value);
    await this.saveHiveRaw(rawHive);
    window.dispatchEvent(new CustomEvent('reg-update', { detail: { path, value } }));
  }

  async createKey(path: string, defaultValue?: RegistryValue): Promise<void> {
    await this.ensureInitialized();
    const rawHive = await this.loadHiveRaw();
    const keyNode = this.ensureKeyNode(rawHive, path);

    if (defaultValue !== undefined) {
      const valueNode: RegistryValueNode = {
        name: 'default',
        type: this.getValueType(defaultValue),
        content: defaultValue,
      };

      const existingIndex = keyNode.content.findIndex(
        (child): child is RegistryValueNode => child.type !== 'key' && child.name === 'default'
      );

      if (existingIndex >= 0) {
        keyNode.content[existingIndex] = valueNode;
      } else {
        keyNode.content.push(valueNode);
      }
    }

    await this.saveHiveRaw(rawHive);
    window.dispatchEvent(new CustomEvent('reg-update', { detail: { path, value: defaultValue } }));
  }

  async getAllRaw(): Promise<RegistryNode[]> {
    await this.ensureInitialized();
    return this.loadHiveRaw();
  }

  async getAll(): Promise<Record<string, RegistryValue>> {
    await this.ensureInitialized();
    return await this.loadHiveFlat();
  }

  private async loadHiveRaw(): Promise<RegistryNode[]> {
    try {
      if (!(await vfs.exists(this.HIVE_PATH))) return this.getDefaultHive();
      const content = await vfs.readFile(this.HIVE_PATH);
      const text = typeof content === 'string' ? content : await (content as Blob).text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed) && parsed.every((node) => this.isRegistryNode(node))) {
        return parsed as RegistryNode[];
      }

      if (parsed && typeof parsed === 'object') {
        return this.migrateLegacyHive(parsed as Record<string, RegistryValue>);
      }

      return this.getDefaultHive();
    } catch (e) {
      console.error("Registry: Hive corrupted. AmerOS may fail to boot.", e);
      return this.getDefaultHive();
    }
  }

  private async loadHiveFlat(): Promise<Record<string, RegistryValue>> {
    const rawHive = await this.loadHiveRaw();
    return this.flattenHive(rawHive);
  }

  private async saveHiveRaw(data: RegistryNode[]): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await vfs.writeFile(this.HIVE_PATH, content);
  }

  private flattenHive(nodes: RegistryNode[], parentPath = ""): Record<string, RegistryValue> {
    const result: Record<string, RegistryValue> = {};

    for (const node of nodes) {
      if (node.type === 'key') {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

        for (const child of node.content) {
          if (child.type === 'key') {
            Object.assign(result, this.flattenHive([child], currentPath));
          } else {
            const entryPath = child.name === 'default' ? currentPath : `${currentPath}/${child.name}`;
            result[entryPath] = child.content;
          }
        }
      }
    }

    return result;
  }

  private setValueNode(nodes: RegistryNode[], path: string, value: RegistryValue): void {
    const keyPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : path;
    const valueName = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : 'default';
    const keyNode = this.ensureKeyNode(nodes, keyPath);
    const valueNode: RegistryValueNode = {
      name: valueName,
      type: this.getValueType(value),
      content: value,
    };

    const existingIndex = keyNode.content.findIndex(
      (child): child is RegistryValueNode => child.type !== 'key' && child.name === valueName
    );

    if (existingIndex >= 0) {
      keyNode.content[existingIndex] = valueNode;
    } else {
      keyNode.content.push(valueNode);
    }
  }

  private ensureKeyNode(nodes: RegistryNode[], path: string): RegistryKeyNode {
    const keyMap = new Map<string, RegistryKeyNode>();

    const buildIndex = (currentNodes: RegistryNode[], currentPath = "") => {
      for (const node of currentNodes) {
        if (node.type === 'key') {
          const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          keyMap.set(fullPath, node);
          buildIndex(node.content, fullPath);
        }
      }
    };

    buildIndex(nodes);

    const createOrGet = (fullPath: string): RegistryKeyNode => {
      if (keyMap.has(fullPath)) {
        return keyMap.get(fullPath)!;
      }

      const name = fullPath.split('/').pop() ?? fullPath;
      const newNode: RegistryKeyNode = { name, type: 'key', content: [] };
      keyMap.set(fullPath, newNode);

      if (fullPath.includes('/')) {
        const parentPath = fullPath.slice(0, fullPath.lastIndexOf('/'));
        const parent = createOrGet(parentPath);
        parent.content.push(newNode);
      } else {
        nodes.push(newNode);
      }

      return newNode;
    };

    return createOrGet(path);
  }

  private migrateLegacyHive(hive: Record<string, RegistryValue>): RegistryNode[] {
    const roots: RegistryNode[] = [];
    const keyMap = new Map<string, RegistryKeyNode>();

    const ensureKey = (fullPath: string): RegistryKeyNode => {
      if (keyMap.has(fullPath)) {
        return keyMap.get(fullPath)!;
      }

      const name = fullPath.split('/').pop() ?? fullPath;
      const node: RegistryKeyNode = { name, type: 'key', content: [] };
      keyMap.set(fullPath, node);

      if (fullPath.includes('/')) {
        const parentPath = fullPath.slice(0, fullPath.lastIndexOf('/'));
        const parent = ensureKey(parentPath);
        parent.content.push(node);
      } else {
        roots.push(node);
      }

      return node;
    };

    for (const fullPath of Object.keys(hive)) {
      const value = hive[fullPath];
      const keyPath = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : fullPath;
      const valueName = fullPath.includes('/') ? fullPath.slice(fullPath.lastIndexOf('/') + 1) : 'default';
      const keyNode = ensureKey(keyPath);
      const existingIndex = keyNode.content.findIndex(
        (child): child is RegistryValueNode => child.type !== 'key' && child.name === valueName
      );
      const valueNode: RegistryValueNode = {
        name: valueName,
        type: this.getValueType(value),
        content: value,
      };

      if (existingIndex >= 0) {
        keyNode.content[existingIndex] = valueNode;
      } else {
        keyNode.content.push(valueNode);
      }
    }

    return roots;
  }

  private getValueType(value: RegistryValue): RegistryValueType {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    return 'object';
  }

  private isRegistryNode(node: any): node is RegistryNode {
    if (!node || typeof node !== 'object' || typeof node.name !== 'string' || typeof node.type !== 'string') {
      return false;
    }

    if (node.type === 'key') {
      return Array.isArray(node.content) && node.content.every((child: any) => this.isRegistryNode(child));
    }

    return 'content' in node;
  }

  private getDefaultHive(): RegistryNode[] {
    return defaultRegistryHive as RegistryNode[];
  }

  /** Groundwork for Setup/Recovery: Wipes the system hive */
  async factoryReset() {
    await vfs.delete(this.HIVE_PATH);
    window.location.reload();
  }
}

export const registry = new Registry();