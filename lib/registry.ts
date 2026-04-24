"use client"

import { vfs } from "./vfs";
import defaultRegistryHive from "./default-registry.json";

/**
 * AmerOS Registry - System Configuration Store
 * Lives on C:/Windows/System32/config/
 */

export type RegistryValue = string | number | boolean | object | null;
export type RegistryValueType = 'string' | 'number' | 'boolean' | 'object';

/**
 * Represents a hierarchical folder structure inside the Registry. 
 * Can contain both child Keys or specific Values.
 */
export interface RegistryKeyNode {
  name: string;
  type: 'key';
  content: RegistryNode[];
}

/**
 * Represents a leaf node holding tangible configuration data stored within a Registry Key.
 */
export interface RegistryValueNode {
  name: string;
  type: RegistryValueType;
  content: RegistryValue;
}

export type RegistryNode = RegistryKeyNode | RegistryValueNode;



/**
 * AmerOS Global System Registry Core Engine.
 * Responsible for mimicking traditional regedit hierarchical tracking to securely store 
 * settings across booting sequences, UI preferences, and system states.
 */
class Registry {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly SYSTEM_DIR = "/System/config";

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

  /**
   * Retrieves a typed value securely from the Registry tree.
   * If the requested path is not found, the fallback `defaultValue` is returned.
   *
   * @param path Full Registry path string (e.g. `HKEY_CURRENT_USER/Control Panel/Desktop`).
   * @param defaultValue Graceful fallback if path is absent.
   */
  async get<T>(path: string, defaultValue: T): Promise<T> {
    await this.ensureInitialized();
    try {
      const hive = await this.loadHiveFlat();
      return hive[path] !== undefined ? (hive[path] as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Sets a config value at the specified Registry Path and commits it securely to storage.
   * Also broadcasts an active OS `reg-update` event so running applications dynamically update.
   *
   * @param path Full target key string path.
   * @param value Setting assignment.
   */
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

  /**
   * Returns the names of all sub-keys directly under the specified path.
   */
  async getKeys(path: string): Promise<string[]> {
    await this.ensureInitialized();
    const rawHive = await this.loadHiveRaw();
    const keyNode = this.findKeyNode(rawHive, path);
    if (!keyNode) return [];
    return keyNode.content
      .filter((node): node is RegistryKeyNode => node.type === 'key')
      .map((node) => node.name);
  }

  /**
   * Returns all named values directly within the specified key path.
   */
  async getValues(path: string): Promise<Record<string, RegistryValue>> {
    await this.ensureInitialized();
    const rawHive = await this.loadHiveRaw();
    const keyNode = this.findKeyNode(rawHive, path);
    if (!keyNode) return {};

    const values: Record<string, RegistryValue> = {};
    for (const node of keyNode.content) {
      if (node.type !== 'key') {
        values[node.name] = node.content;
      }
    }
    return values;
  }

  async deleteKey(path: string): Promise<void> {
    await this.ensureInitialized();
    const rawHive = await this.loadHiveRaw();
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : "";
    const keyName = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
    
    if (!parentPath) {
      const index = rawHive.findIndex(n => n.type === 'key' && n.name === keyName);
      if (index >= 0) {
        rawHive.splice(index, 1);
        await this.saveHiveRaw(rawHive);
        window.dispatchEvent(new CustomEvent('reg-update', { detail: { path, value: null } }));
      }
      return;
    }

    const parentNode = this.findKeyNode(rawHive, parentPath);
    if (parentNode) {
      const index = parentNode.content.findIndex(n => n.type === 'key' && n.name === keyName);
      if (index >= 0) {
        parentNode.content.splice(index, 1);
        await this.saveHiveRaw(rawHive);
        window.dispatchEvent(new CustomEvent('reg-update', { detail: { path, value: null } }));
      }
    }
  }

  private normalizePath(path: string): string {
    return path.replace(/\/+$/, '').trim();
  }

  private findKeyNode(nodes: RegistryNode[], path: string): RegistryKeyNode | null {
    const normalized = this.normalizePath(path);
    if (!normalized) return null;

    const parts = normalized.split('/');
    let currentNodes = nodes;
    let targetNode: RegistryKeyNode | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase();
      const found = currentNodes.find((n): n is RegistryKeyNode => 
        n.type === 'key' && n.name.toLowerCase() === part
      );
      if (!found) return null;
      if (i === parts.length - 1) {
        targetNode = found;
      } else {
        currentNodes = found.content;
      }
    }
    return targetNode;
  }

  private async loadHiveRaw(): Promise<RegistryNode[]> {
    try {
      const hive: RegistryNode[] = [];
      const files = await vfs.ls(this.SYSTEM_DIR, { types: "file", depth: 1 });
      for (const file of files) {
        if (file.name.endsWith('.reg')) {
          const path = `${this.SYSTEM_DIR}/${file.name}`;
          const content = await vfs.readFile(path);
          const text = typeof content === 'string' ? content : await (content as Blob).text();
          const node = JSON.parse(text);
          if (this.isRegistryNode(node)) {
            hive.push(node);
          } else {
            console.warn(`Registry: Skipping invalid hive file ${path}`);
          }
        }
      }
      if (hive.length > 0) {
        return hive;
      }
      return this.getDefaultHive();
    } catch (e) {
      console.error("Registry: Hive corrupted or invalid JSON. Falling back to defaults.", e);
      return this.getDefaultHive();
    }
  }

  private async loadHiveFlat(): Promise<Record<string, RegistryValue>> {
    const rawHive = await this.loadHiveRaw();
    return this.flattenHive(rawHive);
  }

  private async saveHiveRaw(data: RegistryNode[]): Promise<void> {
    await vfs.mkdir(this.SYSTEM_DIR);

    const existingFiles = await vfs.ls(this.SYSTEM_DIR, { types: "file", depth: 1 });
    const savedFileNames = new Set<string>();

    for (const node of data) {
      const content = JSON.stringify(node, null, 2);
      const path = `${this.SYSTEM_DIR}/${node.name}.reg`;
      await vfs.writeFile(path, content);
      savedFileNames.add(`${node.name}.reg`);
    }

    for (const file of existingFiles) {
      if (file.name.endsWith('.reg') && !savedFileNames.has(file.name)) {
        await vfs.delete(`${this.SYSTEM_DIR}/${file.name}`);
      }
    }
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
    const normalized = this.normalizePath(path);

    // 1. If the path matches an existing key, we target its (Default) value
    if (this.findKeyNode(nodes, normalized)) {
      const keyNode = this.ensureKeyNode(nodes, normalized);
      this.setNamedValue(keyNode, 'default', value);

      // 2. Cleanup: If a "shadow" value with the same name exists in the parent key, remote it
      if (normalized.includes('/')) {
        const lastSlashIndex = normalized.lastIndexOf('/');
        const parentPath = normalized.slice(0, lastSlashIndex);
        const keyName = normalized.slice(lastSlashIndex + 1);
        
        const parentNode = this.findKeyNode(nodes, parentPath);
        if (parentNode) {
          const shadowIndex = parentNode.content.findIndex(
            (n): n is RegistryValueNode => n.type !== 'key' && n.name.toLowerCase() === keyName.toLowerCase()
          );
          if (shadowIndex >= 0) {
            parentNode.content.splice(shadowIndex, 1);
          }
        }
      }
      return;
    }

    // 2. Otherwise, split the path into the parent key and the value name
    const keyPath = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : '';
    const valueName = normalized.includes('/') ? normalized.slice(normalized.lastIndexOf('/') + 1) : normalized;
    
    const keyNode = this.ensureKeyNode(nodes, keyPath);
    this.setNamedValue(keyNode, valueName, value);
  }

  private setNamedValue(keyNode: RegistryKeyNode, name: string, value: RegistryValue): void {
    const valueNode: RegistryValueNode = {
      name,
      type: this.getValueType(value),
      content: value,
    };

    const existingIndex = keyNode.content.findIndex(
      (child): child is RegistryValueNode => child.type !== 'key' && child.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIndex >= 0) {
      keyNode.content[existingIndex] = valueNode;
    } else {
      keyNode.content.push(valueNode);
    }
  }

  private ensureKeyNode(nodes: RegistryNode[], path: string): RegistryKeyNode {
    const normalized = this.normalizePath(path);
    const keyMap = new Map<string, RegistryKeyNode>();

    const buildIndex = (currentNodes: RegistryNode[], currentPath = "") => {
      for (const node of currentNodes) {
        if (node.type === 'key') {
          const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          keyMap.set(fullPath.toLowerCase(), node);
          buildIndex(node.content, fullPath);
        }
      }
    };

    buildIndex(nodes);

    const createOrGet = (fullPath: string): RegistryKeyNode => {
      const lowerPath = fullPath.toLowerCase();
      if (keyMap.has(lowerPath)) {
        return keyMap.get(lowerPath)!;
      }

      const name = fullPath.split('/').pop() ?? fullPath;
      const newNode: RegistryKeyNode = { name, type: 'key', content: [] };
      keyMap.set(lowerPath, newNode);

      if (fullPath.includes('/')) {
        const parentPath = fullPath.slice(0, fullPath.lastIndexOf('/'));
        const parent = createOrGet(parentPath);
        parent.content.push(newNode);
      } else {
        nodes.push(newNode);
      }

      return newNode;
    };

    return createOrGet(normalized);
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

  /** Exports the entire registry hive as a JSON Blob for download. */
  async exportHive(): Promise<Blob> {
    await this.ensureInitialized();
    const rawHive = await this.loadHiveRaw();
    const json = JSON.stringify(rawHive, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /** Imports a registry hive from a JSON Blob, overwriting the current hive. */
  async importHive(blob: Blob): Promise<void> {
    await this.ensureInitialized();
    const text = await blob.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || !parsed.every((node) => this.isRegistryNode(node))) {
      throw new Error('Invalid registry hive format.');
    }
    await this.saveHiveRaw(parsed as RegistryNode[]);
    window.dispatchEvent(new CustomEvent('reg-update'));
  }

  /** Groundwork for Setup/Recovery: Wipes the system hive */
  async factoryReset() {
    await vfs.delete(this.HIVE_PATH);
    window.location.reload();
  }
}

export const registry = new Registry();