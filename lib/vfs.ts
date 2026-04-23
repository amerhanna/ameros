"use client";

import { configure, fs, resolveMountConfig, type Backend } from "@zenfs/core";
import { IndexedDB, WebAccess } from "@zenfs/dom";
import defaultVfs from "./vfs-defaults";

/**
 * AmerOS Virtual File System (VFS) - Phase 2
 * Powered by ZenFS (@zenfs/core + @zenfs/dom)
 * Root (/) -> OPFS (WebAccess) for speed
 * System (/System) -> IndexedDB for OS metadata isolation
 */

export interface VFSNode {
  path: string;
  name: string;
  type: "dir" | "file";
  lastModified: number;
  isMountPoint?: boolean;
  status?: "granted" | "denied" | "prompt";
  children?: VFSNode[];
}

export interface LSOptions {
  types?: "file" | "dir" | "all";
  name?: string;
  depth?: number;
  isSearch?: boolean;
}

export type FolderNode = VFSNode;
export type DriveNode = VFSNode;
export type FolderTreeNode = VFSNode;

export interface VFSProperties {
  size: number;
  lastModified: number;
  type: "file" | "dir";
  readOnly: boolean;
  path: string;
}

const OLD_DB_NAME = "AmerOS_VFS";
const SYSTEM_MOUNTS_DIR = "/System/mounts";

class VFS {
  private initPromise: Promise<void> | null = null;
  private mountPoints: Set<string> = new Set();

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // 1. Request persistence
        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
          try {
            await navigator.storage.persist();
          } catch (err) {
            console.warn("VFS: Storage persistence request failed", err);
          }
        }

        // 2. Configure ZenFS
        // We prioritize OPFS (WebAccess) but fallback to IndexedDB if unavailable
        try {
          let opfsHandle: any = null;
          if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.getDirectory) {
            try {
              opfsHandle = await navigator.storage.getDirectory();
            } catch (err) {
              console.warn("VFS: Failed to get OPFS directory handle", err);
            }
          }

          if (opfsHandle) {
            await configure({
              mounts: {
                "/": { backend: WebAccess, handle: opfsHandle },
                "/System": IndexedDB,
                "/System/mnt": { backend: IndexedDB, storeName: "external_mounts" },
              },
            });
          } else {
            throw new Error("OPFS not available");
          }
        } catch (err) {
          console.warn("VFS: OPFS (WebAccess) failed or not supported, falling back to IndexedDB for root", err);
          await configure({
            mounts: {
              "/": IndexedDB,
              "/System": IndexedDB,
              "/System/mnt": { backend: IndexedDB, storeName: "external_mounts" },
            },
          });
        }

        // 3. Seed Defaults
        await this.seedDefaults();

        // 4. Data Migration (Optional)
        await this.migrateLegacyData();

        // 5. Load saved mounts (Background - Non-blocking)
        this.restoreMounts().catch((err) => console.warn("VFS: Background mount restoration failed", err));

        console.log("VFS: ZenFS initialized at root (/)");
      } catch (err) {
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  private async migrateLegacyData() {
    if (typeof indexedDB === "undefined") return;

    try {
      const dbs = await indexedDB.databases();
      if (!dbs.find((db) => db.name === OLD_DB_NAME)) return;

      console.log("VFS: Legacy AmerOS_VFS detected. Starting migration...");

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(OLD_DB_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(["files"], "readonly");
      const store = transaction.objectStore("files");
      const request = store.getAll();

      const nodes = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const node of nodes) {
        const newPath = node.path.replace(/^C:/, "");
        if (!newPath || newPath === "/") continue;

        try {
          if (node.type === "dir") {
            if (!(await this.pathExists(newPath))) await fs.promises.mkdir(newPath, { recursive: true });
          } else {
            const parentDir = newPath.substring(0, newPath.lastIndexOf("/"));
            if (parentDir && parentDir !== "" && !(await this.pathExists(parentDir))) {
              await fs.promises.mkdir(parentDir, { recursive: true });
            }

            let content = node.content;
            if (content instanceof Blob) {
              content = new Uint8Array(await content.arrayBuffer());
            }
            await fs.promises.writeFile(newPath, content || new Uint8Array());
          }
        } catch (err) {
          console.warn(`VFS: Migration failed for ${node.path}:`, err);
        }
      }

      db.close();
      await new Promise<void>((resolve, reject) => {
        const delReq = indexedDB.deleteDatabase(OLD_DB_NAME);
        delReq.onsuccess = () => resolve();
        delReq.onerror = () => reject(delReq.error);
      });

      console.log("VFS: Legacy migration completed.");
    } catch (err) {
      console.error("VFS: Data migration error:", err);
    }
  }

  private async seedDefaults() {
    try {
      // 1. Ensure core system directories exist
      const coreDirs = ["/home", "/System", SYSTEM_MOUNTS_DIR];
      for (const dir of coreDirs) {
        if (!(await this.pathExists(dir))) {
          await fs.promises.mkdir(dir, { recursive: true });
        }
      }

      // 2. Seed from manifest
      for (const folder of defaultVfs.folders) {
        if (!(await this.pathExists(folder))) {
          await fs.promises.mkdir(folder, { recursive: true });
        }
      }

      for (const file of defaultVfs.files) {
        const path = "/" + file.relativePath;
        if (!(await this.pathExists(path))) {
          try {
            // Check if parent directory exists
            const parent = path.substring(0, path.lastIndexOf("/"));
            if (parent && !(await this.pathExists(parent))) {
              await fs.promises.mkdir(parent, { recursive: true });
            }

            // Decode base64 content
            const binaryString = atob(file.contentBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            await fs.promises.writeFile(path, bytes);
          } catch (err) {
            console.warn(`VFS: Failed to seed file ${path}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("VFS: Seeding failed", err);
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.promises.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  private async getHandleStore(mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AmerOS_MountHandles", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("handles")) {
          db.createObjectStore("handles");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("handles", mode);
        resolve(transaction.objectStore("handles"));
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async restoreMounts() {
    try {
      if (!(await this.pathExists(SYSTEM_MOUNTS_DIR))) {
        await fs.promises.mkdir(SYSTEM_MOUNTS_DIR, { recursive: true });
      }

      // 1. Get handles from IndexedDB
      const store = await this.getHandleStore();
      const request = store.getAll();
      const keysRequest = store.getAllKeys();

      const [handles, names] = await Promise.all([
        new Promise<FileSystemDirectoryHandle[]>((resolve) => {
          request.onsuccess = () => resolve(request.result);
        }),
        new Promise<string[]>((resolve) => {
          keysRequest.onsuccess = () => resolve(keysRequest.result as string[]);
        }),
      ]);

      // 2. Mount each one
      for (const name of names) {
        const handle = handles[names.indexOf(name)];
        const mountPath = `/${name}`;

        try {
          const config = await resolveMountConfig({ backend: WebAccess, handle });

          if (!(await this.pathExists(mountPath))) await fs.promises.mkdir(mountPath, { recursive: true });

          try {
            fs.mount(mountPath, config);
            this.mountPoints.add(name);
            console.log(`VFS: Restored mount ${mountPath}`);
          } catch (mountErr) {
            if (String(mountErr).includes("already in use")) {
              this.mountPoints.add(name);
            } else {
              throw mountErr;
            }
          }
        } catch (err) {
          console.warn(`VFS: Failed to restore mount ${name}:`, err);
        }
      }
      // Notify root that mounts have been restored
      this.notifyChange("/");
    } catch (err) {
      console.warn("VFS: Restore mounts failed:", err);
    }
  }

  /**
   * Lists nodes in a directory.
   * Special logic for root (/):
   * - Shows /home as "Home"
   * - Shows mounts from /mnt directly as if top-level
   * - Hides /System, /mnt (the parent), and others unless showHidden is true
   */
  async ls(path: string, options: LSOptions = { depth: 1 }): Promise<VFSNode[]> {
    await this.init();
    const normalized = this.normalize(path);
    const { types = "all", name = "*", depth = 1, isSearch = false } = options;
    const nameRegex = this.wildcardToRegex(name);

    // Root-specific curated view logic (only for depth 1 at '/')
    if (normalized === "/" && depth === 1 && !isSearch) {
      const results: VFSNode[] = [];

      // Home is ALWAYS first
      if (fs.existsSync("/home")) {
        results.push(await this.getNodeInfo("/home", "Home"));
      }

      // Add Mounts
      for (const mount of this.mountPoints) {
        const mountPath = `/${mount}`;
        if (fs.existsSync(mountPath)) {
          results.push({
            ...(await this.getNodeInfo(mountPath, mount)),
            isMountPoint: true,
          });
        }
      }
      return this.filterNodes(results, { types, nameRegex });
    }

    // Standard recursive traversal, skipping internal folders at the root
    const results: VFSNode[] = [];
    const walk = async (currPath: string, currDepth: number) => {
      try {
        const entries = await fs.promises.readdir(currPath, { withFileTypes: true });
        const nodes = entries.map((entry) => this.formatDirent(currPath, entry));

        for (const node of nodes) {
          const matchesType = types === "all" || node.type === types;
          const matchesName = nameRegex.test(node.name);

          // If it matches, add it to results based on search/nested mode
          if (matchesType && matchesName) {
            if (isSearch) {
              results.push(node);
            } else if (currDepth === depth) {
              results.push(node);
            }
          }

          // Recurse if needed
          if (node.type === "dir" && currDepth < depth) {
            const children = await walk(node.path, currDepth + 1);
            if (!isSearch && !matchesName && matchesType) {
              // If we are building a tree and this folder didn't match but we are going deeper?
              // Usually ls(depth) means we want the structure.
            }
            if (!isSearch) {
              node.children = children;
              if (currDepth === depth - 1 && !isSearch) {
                // We only add top-level nodes to results in nested mode
                if (currPath === normalized) {
                  results.push(node);
                }
              }
            }
          }
        }
        return nodes;
      } catch (err) {
        return [];
      }
    };

    // Refined recursive logic for unified ls
    const recursiveList = async (currPath: string, currDepth: number): Promise<VFSNode[]> => {
      try {
        const entries = await fs.promises.readdir(currPath, { withFileTypes: true });
        const nodes = entries.map((entry) => this.formatDirent(currPath, entry));
        const matchedNodes: VFSNode[] = [];

        for (const node of nodes) {
          // Explicitly hide system folders from the top level
          if (currPath === "/" && (node.name === "System" || node.name === "mnt")) continue;

          const matchesType = types === "all" || node.type === types;
          const matchesName = nameRegex.test(node.name);

          if (node.type === "dir" && currDepth < depth) {
            node.children = await recursiveList(node.path, currDepth + 1);
          }

          if (isSearch) {
            if (matchesType && matchesName) results.push(node);
          } else {
            if (matchesType && matchesName) matchedNodes.push(node);
          }
        }
        return matchedNodes;
      } catch {
        return [];
      }
    };

    if (isSearch) {
      await recursiveList(normalized, 1);
      return results;
    } else {
      return await recursiveList(normalized, 1);
    }
  }

  private filterNodes(nodes: VFSNode[], criteria: { types: string; nameRegex: RegExp }): VFSNode[] {
    return nodes.filter((node) => {
      const matchesType = criteria.types === "all" || node.type === criteria.types;
      const matchesName = criteria.nameRegex.test(node.name);
      return matchesType && matchesName;
    });
  }

  private wildcardToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const regex = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${regex}$`, "i");
  }

  private formatDirent(parent: string, entry: any): VFSNode {
    const path = `${parent === "/" ? "" : parent}/${entry.name}`;
    return {
      path,
      name: entry.name,
      type: entry.isDirectory() ? "dir" : "file",
      lastModified: Date.now(), // Metadata should be fetched lazily if needed
      isMountPoint: this.isMountPoint(path),
    };
  }

  private async getNodeInfo(path: string, alias?: string): Promise<VFSNode> {
    try {
      const stats = await fs.promises.stat(path);
      const name = alias || path.split("/").filter(Boolean).pop() || "/";
      return {
        path,
        name,
        type: stats.isDirectory() ? "dir" : "file",
        lastModified: stats.mtimeMs,
        isMountPoint: this.isMountPoint(path),
      };
    } catch (err) {
      return {
        path,
        name: alias || path.split("/").filter(Boolean).pop() || "unknown",
        type: "file",
        lastModified: Date.now(),
        isMountPoint: this.isMountPoint(path),
      };
    }
  }

  async exists(path: string): Promise<boolean> {
    await this.init();
    return fs.existsSync(this.normalize(path));
  }

  async readFile(path: string) {
    await this.init();
    const data = await fs.promises.readFile(this.normalize(path));
    return new Blob([data]);
  }

  async writeFile(path: string, content: string | ArrayBuffer | Blob) {
    await this.init();
    let data: Uint8Array | string;
    if (content instanceof Blob) {
      data = new Uint8Array(await content.arrayBuffer());
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content);
    } else {
      data = content;
    }
    await fs.promises.writeFile(this.normalize(path), data);
    this.notifyChange(path);
  }

  async mkdir(path: string) {
    await this.init();
    await fs.promises.mkdir(this.normalize(path), { recursive: true });
    this.notifyChange(path);
  }

  async touch(path: string) {
    await this.init();
    const normalized = this.normalize(path);
    try {
      await fs.promises.stat(normalized);
    } catch {
      await fs.promises.writeFile(normalized, new Uint8Array());
      this.notifyChange(normalized);
    }
  }

  async delete(path: string) {
    await this.init();
    await fs.promises.rm(this.normalize(path), { recursive: true, force: true });
    this.notifyChange(path);
  }

  async rename(path: string, newName: string) {
    await this.init();
    const normalized = this.normalize(path);
    const parent = normalized.substring(0, normalized.lastIndexOf("/")) || "/";
    const newPath = this.normalize(`${parent}/${newName}`);
    await fs.promises.rename(normalized, newPath);
    this.notifyChange(path);
    this.notifyChange(newPath);
  }

  async copy(src: string, dest: string) {
    await this.init();
    const srcNorm = this.normalize(src);
    const destNorm = this.normalize(dest);
    const stats = await fs.promises.stat(srcNorm);

    if (stats.isDirectory()) {
      if (!(await this.exists(destNorm))) await fs.promises.mkdir(destNorm, { recursive: true });
      const entries = await fs.promises.readdir(srcNorm);
      for (const entry of entries) {
        await this.copy(`${srcNorm}/${entry}`, `${destNorm}/${entry}`);
      }
    } else {
      await fs.promises.copyFile(srcNorm, destNorm);
    }
    this.notifyChange(dest);
  }

  async move(src: string, dest: string) {
    await this.init();
    await fs.promises.rename(this.normalize(src), this.normalize(dest));
    this.notifyChange(src);
    this.notifyChange(dest);
  }

  async getSize(path: string, maxDepth = 3): Promise<number> {
    await this.init();
    const normalized = this.normalize(path);
    try {
      const stats = await fs.promises.stat(normalized);
      if (stats.isFile()) return stats.size;

      if (maxDepth <= 0) return 0;

      let total = 0;
      const entries = await fs.promises.readdir(normalized);
      for (const entry of entries) {
        total += await this.getSize(`${normalized}/${entry}`, maxDepth - 1);
      }
      return total;
    } catch (err) {
      return 0;
    }
  }

  async getProperties(path: string): Promise<VFSProperties> {
    await this.init();
    const normalized = this.normalize(path);
    const stats = await fs.promises.stat(normalized);
    return {
      size: await this.getSize(normalized),
      lastModified: stats.mtimeMs,
      type: stats.isDirectory() ? "dir" : "file",
      readOnly: false,
      path: normalized,
    };
  }

  async mountFolder(handle: FileSystemDirectoryHandle): Promise<string> {
    await this.init();
    const name = this.getUniqueMountName(handle.name);
    const mountPath = `/${name}`;

    // 1. Check if already mounted (should be handled by getUniqueMountName, but for safety)
    if (this.mountPoints.has(name)) {
      console.log(`VFS: ${name} is already mounted, skipping.`);
      return name;
    }

    // 2. Create mount point if it doesn't exist
    if (!fs.existsSync(mountPath)) {
      try {
        fs.mkdirSync(mountPath, { recursive: true });
      } catch (err) {
        console.warn(`VFS: Failed to create mount point ${mountPath}:`, err);
      }
    }

    // 3. Mount in ZenFS
    try {
      const config = await resolveMountConfig({ backend: WebAccess, handle });
      fs.mount(mountPath, config);
    } catch (err) {
      console.error(`VFS: Failed to mount ${name}:`, err);
      throw new Error(`Failed to mount folder: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 4. Store handle in IndexedDB for persistence
    try {
      const store = await this.getHandleStore("readwrite");
      store.put(handle, name);
    } catch (err) {
      console.warn("VFS: Failed to persist mount handle:", err);
    }

    // 5. Store metadata for legacy support
    try {
      if (!fs.existsSync(SYSTEM_MOUNTS_DIR)) fs.mkdirSync(SYSTEM_MOUNTS_DIR, { recursive: true });
      fs.writeFileSync(`${SYSTEM_MOUNTS_DIR}/${name}.mnt`, JSON.stringify({ name, path: mountPath }));
    } catch (err) {
      console.warn("VFS: Failed to write mount metadata:", err);
    }

    this.mountPoints.add(name);
    this.notifyChange("/");
    return name;
  }

  async unmountFolder(name: string) {
    await this.init();
    const mountPath = `/${name}`;

    try {
      fs.umount(mountPath);
    } catch (err) {
      console.warn(`VFS: Failed to unmount ${mountPath}:`, err);
    }

    // Remove handle from IndexedDB
    try {
      const store = await this.getHandleStore("readwrite");
      store.delete(name);
    } catch (err) {
      console.warn("VFS: Failed to remove persisted handle:", err);
    }

    if (fs.existsSync(`${SYSTEM_MOUNTS_DIR}/${name}.mnt`)) {
      try {
        fs.rmSync(`${SYSTEM_MOUNTS_DIR}/${name}.mnt`);
      } catch {}
    }
    this.mountPoints.delete(name);
    this.notifyChange("/");
  }

  async getMounts() {
    await this.init();
    return Array.from(this.mountPoints).map((name) => ({
      letter: name,
      name: name,
      path: `/${name}`,
    }));
  }

  private getUniqueMountName(name: string): string {
    const reserved = ["home", "System", "mnt", "System/mnt"];
    let finalName = name;
    let counter = 1;

    const isTaken = (n: string) =>
      this.mountPoints.has(n) || reserved.some((r) => r.toLowerCase() === n.toLowerCase()) || fs.existsSync(`/${n}`);

    while (isTaken(finalName)) {
      counter++;
      finalName = `${name}-${counter}`;
    }

    return finalName;
  }

  async checkPermission(name: string): Promise<"granted" | "denied" | "prompt"> {
    return "granted";
  }

  async requestPermission(name: string): Promise<boolean> {
    return true;
  }

  // Deprecated methods replaced by unified ls()

  async exportStorage(excludePaths: string[] = []): Promise<Blob> {
    await this.init();
    const { BlobWriter, ZipWriter, BlobReader } = await import("@zip.js/zip.js");
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

    const walk = async (dir: string) => {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = this.normalize(`${dir === "/" ? "" : dir}/${entry}`);
        if (excludePaths.some((p) => fullPath === this.normalize(p) || fullPath.startsWith(this.normalize(p) + "/"))) continue;

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          await zipWriter.add(entry + "/", new BlobReader(new Blob([])), { directory: true });
          await walk(fullPath);
        } else {
          const data = fs.readFileSync(fullPath);
          await zipWriter.add(entry, new BlobReader(new Blob([data])));
        }
      }
    };

    await walk("/");
    return await zipWriter.close();
  }

  async importStorage(zipBlob: Blob) {
    await this.init();
    const { ZipReader, BlobReader, Uint8ArrayWriter } = await import("@zip.js/zip.js");
    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      const path = "/" + entry.filename.replace(/\/$/, "");
      if (entry.directory) {
        if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
      } else {
        const data = await entry.getData!(new Uint8ArrayWriter());
        const parent = path.substring(0, path.lastIndexOf("/"));
        if (parent && !fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
        fs.writeFileSync(path, data);
      }
    }
    await zipReader.close();
    this.notifyChange("/");
  }

  async clearStorage(excludePaths: string[] = []) {
    await this.init();
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = this.normalize(`${dir === "/" ? "" : dir}/${entry}`);
        if (excludePaths.some((p) => fullPath === this.normalize(p) || fullPath.startsWith(this.normalize(p) + "/"))) continue;

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          walk(fullPath);
          try {
            if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
          } catch {}
        } else {
          fs.rmSync(fullPath);
        }
      }
    };
    walk("/");
    this.notifyChange("/");
  }

  async factoryReset() {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        // @ts-ignore
        for await (const name of root.keys()) {
          await root.removeEntry(name, { recursive: true });
        }
      } catch {}
    }

    if (typeof indexedDB !== "undefined") {
      try {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      } catch {}
    }

    window.location.reload();
  }

  isMountPoint(path: string): boolean {
    const normalized = this.normalize(path);
    const parts = normalized.split("/").filter(Boolean);
    const name = parts[0];

    return parts.length === 1 && name !== "home" && name !== "System" && this.mountPoints.has(name);
  }

  getVolumeLabel(name: string): string {
    return name;
  }

  private normalize(path: string): string {
    let p = path.replace(/\\/g, "/");
    if (p.startsWith("C:")) p = p.slice(2);
    if (!p.startsWith("/")) p = "/" + p;
    if (p.endsWith("/") && p.length > 1) p = p.slice(0, -1);
    return p;
  }

  private notifyChange(path: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("vfs-change", { detail: { path } }));
    }
  }
}

export const vfs = new VFS();
