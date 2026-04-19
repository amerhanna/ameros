'use client';

import defaultVfs from './vfs-defaults';

/**
 * AmerOS Virtual File System (VFS) - Phase 2
 * Persists to IndexedDB and supports external directory mounting via File System Access API.
 * Supports recursive operations, cross-drive transfers (C: <=> D:), and volume labels.
 */

/**
 * Core structural model for all nodes existing within the VFS index.
 */
export interface BaseVFSNode {
  path: string;
  name: string;
  type: 'drive' | 'dir' | 'file';
  lastModified: number;
  handle?: FileSystemHandle; // For mounted external files/dirs
  status?: 'granted' | 'denied' | 'prompt';
}

export interface DriveNode extends BaseVFSNode {
  type: 'drive';
  children?: FolderTreeNode[];
}

export interface FolderNode extends BaseVFSNode {
  type: 'dir';
  children?: FolderTreeNode[];
}

export interface FileNode extends BaseVFSNode {
  type: 'file';
  content?: string | ArrayBuffer | Blob | File;
}

export type VFSNode = DriveNode | FolderNode | FileNode;

export type FolderTreeNode = DriveNode | FolderNode;

export interface VFSMount {
  letter: string;
  handle: FileSystemDirectoryHandle;
  label?: string;
}

export interface VFSProperties {
  size: number;
  lastModified: number;
  type: 'drive' | 'file' | 'dir';
  readOnly: boolean;
  path: string;
}

type FileSystemPermissionMode = 'read' | 'readwrite';

const DB_NAME = 'AmerOS_VFS';
const DB_VERSION = 2;
const STORE_FILES = 'files';
const STORE_MOUNTS = 'mounts';

/**
 * The Virtual File System API Engine.
 * Transparently manages FileSystem Access API volume mounts alongside a persistent IDB storage fallback (`C:` drive).
 * Provides node traversal, CRUD operations, permission negotiation, and observability.
 */
class VFS {
  private db: IDBDatabase | null = null;
  private mounts: Record<string, VFSMount> = {};
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_FILES)) {
            db.createObjectStore(STORE_FILES, { keyPath: 'path' });
          }
          if (!db.objectStoreNames.contains(STORE_MOUNTS)) {
            db.createObjectStore(STORE_MOUNTS, { keyPath: 'letter' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await this.loadMounts();
      await this.ensureInitialBoot();
    })();

    return this.initPromise;
  }

  private async loadMounts() {
    const transaction = this.db!.transaction(STORE_MOUNTS, 'readonly');
    const store = transaction.objectStore(STORE_MOUNTS);
    const request = store.getAll();

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result;
        results.forEach((m: VFSMount) => {
          this.mounts[m.letter] = m;
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureInitialBoot() {
    // We use getNode directly to avoid deadlocking with exists() -> await init()
    const readme = await this.getNode('C:/readme.txt');
    if (!readme) {
      // Direct IDB writes to bypass public methods (mkdir, writeFile, setVolumeLabel)
      // because they all call `await this.init()` now, which would cause an infinite lock.
      const folderRecords: Record<string, any>[] = defaultVfs.folders.map((folderPath) => ({
        path: folderPath,
        name: folderPath.substring(folderPath.lastIndexOf('/') + 1),
        type: 'dir',
        lastModified: Date.now(),
      }));

      const fileRecords = defaultVfs.files.map((file) => {
        const binary = atob(file.contentBase64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          array[i] = binary.charCodeAt(i);
        }

        return {
          path: `C:/${file.relativePath}`,
          name: file.name,
          type: 'file',
          lastModified: Date.now(),
          content: new Blob([array], { type: file.contentType }),
        };
      });

      const transaction = this.db!.transaction([STORE_FILES, STORE_MOUNTS], 'readwrite');
      const fileStore = transaction.objectStore(STORE_FILES);
      const mountStore = transaction.objectStore(STORE_MOUNTS);

      for (const record of [...folderRecords, ...fileRecords]) {
        fileStore.put(record);
      }

      for (const mount of defaultVfs.mounts) {
        mountStore.put(mount);
        this.mounts[mount.letter] = mount as any;
      }

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  /**
   * Checks if a specified path string completely resolves to a valid node within the VFS index.
   * @param path Full path route (e.g., 'C:/Windows/System32')
   */
  async exists(path: string): Promise<boolean> {
    await this.init();
    const node = await this.getNode(path);
    return !!node;
  }

  private async getNode(path: string): Promise<VFSNode | null> {
    const normalizedPath = this.normalize(path);
    if (normalizedPath === 'C:') return { path: 'C:', name: 'C:', type: 'drive', lastModified: 0 };

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/);
    if (driveMatch) {
      const letter = driveMatch[1];
      const subPath = driveMatch[2] || '/';
      if (letter !== 'C' && this.mounts[letter]) {
        return this.getMountedNode(letter, subPath);
      }
    }

    const transaction = this.db!.transaction(STORE_FILES, 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.get(normalizedPath);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Lists all node children existing at the requested directory.
   * Automatically resolves root drives if requesting `/` or `C:`.
   * @param path Folder path to read.
   * @returns An array of resolved `VFSNode` structures.
   */
  async ls(path: string): Promise<VFSNode[]> {
    await this.init();
    const normalizedPath = this.normalize(path);

    if (normalizedPath === '' || normalizedPath === '/') {
      const cLabel = this.mounts['C']?.label || 'Internal Storage';
      const drives: VFSNode[] = [{ path: 'C:', name: `${cLabel} (C:)`, type: 'drive', lastModified: 0 }];
      for (const letter of Object.keys(this.mounts)) {
        if (letter !== 'C') {
          const mLabel = this.mounts[letter].label || 'Mounted Folder';
          const status = await this.checkPermission(letter);
          drives.push({
            path: `${letter}:`,
            name: `${mLabel} (${letter}:)`,
            type: 'drive',
            lastModified: 0,
            status: status,
          });
        }
      }
      return drives;
    }

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/);
    if (driveMatch) {
      const letter = driveMatch[1];
      const subPath = driveMatch[2] || '/';

      if (letter === 'C') {
        return this.lsIDB(normalizedPath);
      } else if (this.mounts[letter]) {
        return this.lsMounted(letter, subPath);
      }
    }

    return [];
  }

  private async lsIDB(path: string): Promise<VFSNode[]> {
    const transaction = this.db!.transaction(STORE_FILES, 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.openCursor();
    const results: VFSNode[] = [];

    const prefix = path.endsWith('/') ? path : path + '/';

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const nodePath = cursor.value.path;
          if (nodePath.startsWith(prefix)) {
            const relativePart = nodePath.slice(prefix.length);
            if (!relativePart.includes('/') || (relativePart.endsWith('/') && relativePart.split('/').length <= 2)) {
              results.push(cursor.value);
            }
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async lsMounted(letter: string, subPath: string): Promise<VFSNode[]> {
    const rootHandle = this.mounts[letter].handle;
    let currentHandle: FileSystemDirectoryHandle = rootHandle;

    const parts = subPath.split('/').filter(Boolean);
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    const results: VFSNode[] = [];

    try {
      for await (const entry of (currentHandle as any).values()) {
        try {
          results.push({
            path: `${letter}:${subPath === '/' ? '' : subPath}/${entry.name}`,
            name: entry.name,
            type: entry.kind === 'directory' ? 'dir' : 'file',
            lastModified: Date.now(),
            handle: entry,
          });
        } catch (entryErr) {
          console.error(
            `VFS: Failed to process entry in ${letter}:${subPath}. This is likely due to illegal Windows filenames (e.g. leading spaces).`,
            entryErr
          );
        }
      }
    } catch (enumErr) {
      console.error(`VFS: Directory enumeration failed for ${letter}:${subPath}.`, enumErr);
      throw new Error('Unable to read directory content. Windows may be blocking access to these filenames.');
    }
    return results;
  }

  private async getMountedNode(letter: string, subPath: string): Promise<VFSNode | null> {
    if (subPath === '/' || subPath === '') {
      return { path: `${letter}:`, name: `${letter}:`, type: 'dir', lastModified: 0 };
    }

    const rootHandle = this.mounts[letter].handle;
    const parts = subPath.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let currentHandle: FileSystemDirectoryHandle = rootHandle;

    try {
      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      try {
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const fileObj = await fileHandle.getFile();
        return {
          path: `${letter}:${subPath}`,
          name: fileName,
          type: 'file',
          lastModified: fileObj.lastModified,
          handle: fileHandle,
        };
      } catch {
        const dirHandle = await currentHandle.getDirectoryHandle(fileName);
        return {
          path: `${letter}:${subPath}`,
          name: fileName,
          type: 'dir',
          lastModified: 0,
          handle: dirHandle,
        };
      }
    } catch {
      return null;
    }
  }

  /**
   * Reads a file completely into memory.
   * Resolves IDB nodes entirely into Blob/File references. Native mounts yield raw Native Handles.
   * @param path Full filepath target.
   */
  async readFile(path: string): Promise<string | ArrayBuffer | Blob | File> {
    await this.init();
    const node = await this.getNode(path);
    if (!node) throw new Error('File not found');

    if (node.handle && node.type === 'file') {
      const file = await (node.handle as FileSystemFileHandle).getFile();
      return file;
    }

    if (node.type === 'file') {
      return (node as FileNode).content || '';
    }

    throw new Error('Not a file');
  }

  /**
   * Writes content forcefully into a file node at the designated path.
   * Valid strings will be inherently converted to `'text/plain'` blobs.
   * @param path Target filepath to write.
   * @param content Raw data payload string, Buffer, or Blob.
   */
  async writeFile(path: string, content: string | ArrayBuffer | Blob | File) {
    await this.init();
    const normalizedPath = this.normalize(path);
    const name = normalizedPath.split('/').pop()!;

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/);
    if (driveMatch) {
      const letter = driveMatch[1];
      const subPath = driveMatch[2] || '/';
      if (letter !== 'C' && this.mounts[letter]) {
        return this.writeExternal(letter, subPath, content);
      }
    }

    const transaction = this.db!.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);

    let finalContent = content;
    if (typeof content === 'string') {
      finalContent = new Blob([content], { type: 'text/plain' });
    }

    const node: VFSNode = {
      path: normalizedPath,
      name,
      type: 'file',
      content: finalContent,
      lastModified: Date.now(),
    };
    store.put(node);

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async writeExternal(letter: string, subPath: string, content: any) {
    const rootHandle = this.mounts[letter].handle;
    const parts = subPath.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let currentHandle: FileSystemDirectoryHandle = rootHandle;

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
    const writable = await (fileHandle as any).createWritable();
    await writable.write(content);
    await writable.close();
  }

  /**
   * Forces the creation of a Folder Directory strictly.
   * @param path The full desired path for the new folder.
   */
  async mkdir(path: string) {
    await this.init();
    const normalizedPath = this.normalize(path);
    const name = normalizedPath.split('/').pop()!;

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/);
    if (driveMatch) {
      const letter = driveMatch[1];
      const subPath = driveMatch[2] || '/';
      if (letter !== 'C' && this.mounts[letter]) {
        const rootHandle = this.mounts[letter].handle;
        const parts = subPath.split('/').filter(Boolean);
        let currentHandle = rootHandle;
        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
        }
        return;
      }
    }

    const transaction = this.db!.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    const node: VFSNode = {
      path: normalizedPath,
      name,
      type: 'dir',
      lastModified: Date.now(),
    };
    store.put(node);

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async touch(path: string) {
    await this.init();
    if (!(await this.exists(path))) {
      await this.writeFile(path, new Blob([], { type: 'application/octet-stream' }));
    }
  }

  /**
   * Scans and fully deletes a node and all of its nested children automatically.
   * Recursive behavior is executed if the targeted path is verified as a Directory.
   * @param path Path string mapping the desired entity to erase.
   */
  async delete(path: string) {
    await this.init();
    const normalizedPath = this.normalize(path);

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/);
    if (driveMatch) {
      const letter = driveMatch[1];
      const subPath = driveMatch[2] || '/';
      if (letter !== 'C' && this.mounts[letter]) {
        return this.deleteExternal(letter, subPath);
      }
    }

    const transaction = this.db!.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);

    const prefix = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/';
    const request = store.openCursor();

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const nodePath = cursor.value.path;
          if (nodePath === normalizedPath || nodePath.startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteExternal(letter: string, subPath: string) {
    const rootHandle = this.mounts[letter].handle;
    if (subPath === '/' || subPath === '') throw new Error('Cannot delete drive root');

    const parts = subPath.split('/').filter(Boolean);
    const name = parts.pop()!;
    let currentHandle = rootHandle;
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    await (currentHandle as any).removeEntry(name, { recursive: true });
  }

  /**
   * Reassigns the name identity of a specific target node or folder.
   * @param path Target path pointing to the entity.
   * @param newName Flat filename target mapping (Does not execute directory migration).
   */
  async rename(path: string, newName: string) {
    await this.init();
    const normalizedPath = this.normalize(path);

    const driveMatch = normalizedPath.match(/^([A-Z]):$/);
    if (driveMatch) {
      await this.setVolumeLabel(driveMatch[1], newName);
      return;
    }

    const node = await this.getNode(normalizedPath);
    if (!node) throw new Error('Source not found');

    const lastSlash = normalizedPath.lastIndexOf('/');
    const parentPath = normalizedPath.substring(0, lastSlash) || (normalizedPath.includes(':') ? normalizedPath.split(':')[0] + ':' : '/');
    const newPath = this.normalize(`${parentPath}/${newName}`);

    if (node.handle) {
      if (node.type === 'file') {
        if ((node.handle as any).move) {
          await (node.handle as any).move(newName);
          return;
        }
      } else {
        await this.copy(normalizedPath, newPath);
        await this.delete(normalizedPath);
        return;
      }
      throw new Error('Native rename not supported for this handle');
    }

    const transaction = this.db!.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    const prefix = normalizedPath + '/';
    const nodesToUpdate: { oldPath: string; newNode: VFSNode }[] = [];

    const cursorRequest = store.openCursor();
    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const oldChildPath = cursor.value.path;
          if (oldChildPath === normalizedPath) {
            nodesToUpdate.push({ oldPath: oldChildPath, newNode: { ...cursor.value, path: newPath, name: newName } });
          } else if (oldChildPath.startsWith(prefix)) {
            const relative = oldChildPath.slice(prefix.length);
            const newChildPath = newPath + '/' + relative;
            nodesToUpdate.push({ oldPath: oldChildPath, newNode: { ...cursor.value, path: newChildPath } });
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });

    for (const update of nodesToUpdate) {
      await store.delete(update.oldPath);
      await store.put(update.newNode);
    }

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Recursively copies a target entity and all its nested branches effectively to a new path.
   * IDB instances and Native handles resolve correctly between memory barriers.
   * @param src Target Path mapping the identity to clone.
   * @param dest The resulting absolute Path boundary structure containing exactly where it drops.
   */
  async copy(src: string, dest: string) {
    await this.init();
    const srcNode = await this.getNode(src);
    if (!srcNode) throw new Error('Source not found');

    if (srcNode.type === 'dir') {
      await this.mkdir(dest);
      const children = await this.ls(src);
      for (const child of children) {
        await this.copy(child.path, `${dest}/${child.name}`);
      }
      return;
    }

    const content = await this.readFile(src);
    await this.writeFile(dest, content);
  }

  /**
   * Copies the targeted Source completely to the given Dest and then permanently erases the original instance cleanly.
   * Optimizes internally yielding Native `move` APIs when transferring directly within equivalent external File System mounted letters.
   */
  async move(src: string, dest: string) {
    await this.init();
    const srcDrive = src.split(':')[0];
    const destDrive = dest.split(':')[0];
    const srcNode = await this.getNode(src);
    if (!srcNode) throw new Error('Source not found');

    if (srcDrive === destDrive && srcNode.handle) {
      const newName = dest.split('/').pop()!;
      const destParentPath = dest.substring(0, dest.lastIndexOf('/')) || (dest.includes(':') ? dest.split(':')[0] + ':' : '/');
      const destParentNode = await this.getNode(destParentPath);

      if (srcNode.type === 'file' && (srcNode.handle as any).move && destParentNode?.handle) {
        await (srcNode.handle as any).move(destParentNode.handle, newName);
        return;
      }
      await this.copy(src, dest);
      await this.delete(src);
      return;
    }

    await this.copy(src, dest);
    await this.delete(src);
  }

  /**
   * Traverses a path and safely recursively calculates byte size weights for files or huge folder structures.
   */
  async getSize(path: string): Promise<number> {
    await this.init();
    const node = await this.getNode(path);
    if (!node) return 0;

    if (node.type === 'file') {
      if (node.handle) {
        const file = await (node.handle as FileSystemFileHandle).getFile();
        return file.size;
      }
      if (node.content instanceof Blob || node.content instanceof File) return node.content.size;
      if (node.content instanceof ArrayBuffer) return node.content.byteLength;
      return ((node.content as string) || '').length;
    }

    const children = await this.ls(path);
    let total = 0;
    for (const child of children) {
      total += await this.getSize(child.path);
    }
    return total;
  }

  /**
   * Fetches advanced security layout and byte structure characteristics of a path.
   * Also negotiates read/write permission statuses.
   */
  async getProperties(path: string): Promise<VFSProperties> {
    await this.init();
    const node = await this.getNode(path);
    if (!node) throw new Error('Not found');

    const size = await this.getSize(path);
    let readOnly = false;

    if (node.handle) {
      const mode = 'readwrite' as FileSystemPermissionMode;
      const status = await (node.handle as any).queryPermission({ mode });
      readOnly = status !== 'granted';
    }

    return {
      size,
      lastModified: node.lastModified,
      type: node.type,
      readOnly,
      path: node.path,
    };
  }

  async setVolumeLabel(letter: string, label: string) {
    await this.init();
    if (letter === 'C') {
      const transaction = this.db!.transaction(STORE_MOUNTS, 'readwrite');
      const store = transaction.objectStore(STORE_MOUNTS);
      store.put({ letter: 'C', handle: null as any, label });
      this.mounts['C'] = { letter: 'C', handle: null as any, label };
      return;
    }

    if (!this.mounts[letter]) return;
    this.mounts[letter].label = label;
    const transaction = this.db!.transaction(STORE_MOUNTS, 'readwrite');
    const store = transaction.objectStore(STORE_MOUNTS);
    store.put(this.mounts[letter]);
  }

  async getVolumeLabel(letter: string): Promise<string> {
    await this.init();
    return this.mounts[letter]?.label || (letter === 'C' ? 'Local Disk' : 'Removable Disk');
  }

  /**
   * Creates a dedicated external memory Volume mapped exactly natively over a user chosen File System Access OS Handle.
   * Assigns sequential distinct drive mapping assignments (D:, E:, F:, G:, etc.) automatically natively.
   */
  async mountFolder(handle: FileSystemDirectoryHandle): Promise<string> {
    await this.init();
    const letters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const usedLetters = Object.keys(this.mounts);
    const nextLetter = letters.find((l) => !usedLetters.includes(l));

    if (!nextLetter) throw new Error('No available drive letters');

    const mount: VFSMount = { letter: nextLetter, handle, label: handle.name };
    this.mounts[nextLetter] = mount;

    const transaction = this.db!.transaction(STORE_MOUNTS, 'readwrite');
    const store = transaction.objectStore(STORE_MOUNTS);
    store.put(mount);

    return new Promise<string>((resolve, reject) => {
      transaction.oncomplete = () => resolve(nextLetter);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Destroys an existing mounted external hardware connection dropping its state explicitly.
   * System effectively blocks the 'C' internal letter dynamically explicitly.
   */
  async unmountFolder(letter: string): Promise<void> {
    await this.init();
    if (letter === 'C') throw new Error('Cannot unmount boot drive');
    if (!this.mounts[letter]) return;

    delete this.mounts[letter];
    const transaction = this.db!.transaction(STORE_MOUNTS, 'readwrite');
    const store = transaction.objectStore(STORE_MOUNTS);
    store.delete(letter);

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async factoryReset() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => console.warn('VFS factory reset blocked by open connections');
    });

    window.location.reload();
  }

  async getMounts() {
    await this.init();
    return Object.keys(this.mounts).map((letter) => this.mounts[letter]);
  }

  async checkPermission(letter: string): Promise<'granted' | 'denied' | 'prompt'> {
    await this.init();
    if (letter === 'C') return 'granted';
    const mount = this.mounts[letter];
    if (!mount) return 'denied';

    try {
      return await (mount.handle as any).queryPermission({ mode: 'readwrite' });
    } catch (err) {
      console.error(`VFS: Failed to query permission for ${letter}:`, err);
      return 'prompt';
    }
  }

  async requestPermission(letter: string): Promise<boolean> {
    await this.init();
    if (letter === 'C') return true;
    const mount = this.mounts[letter];
    if (!mount) return false;

    try {
      const status = await (mount.handle as any).requestPermission({ mode: 'readwrite' });
      return status === 'granted';
    } catch (err) {
      console.error(`VFS: Failed to request permission for ${letter}:`, err);
      return false;
    }
  }

  async getTree(): Promise<FolderTreeNode[]> {
    await this.init();
    const rootItems = await this.ls('/');
    const drives = rootItems.filter((item) => item.type === 'drive') as DriveNode[];

    const tree: FolderTreeNode[] = [];

    for (const drive of drives) {
      const permission = await this.checkPermission(drive.path[0]);
      let children: FolderTreeNode[] | undefined;

      if (permission === 'granted') {
        try {
          children = await this.getSubTree(drive.path);
        } catch (err) {
          console.warn(`Failed to get subtree for ${drive.path}:`, err);
          children = [];
        }
      } else {
        children = [];
        drive.status = permission;
      }

      const driveNode: FolderTreeNode = {
        ...drive,
        children,
      };
      tree.push(driveNode);
    }

    return tree;
  }

  private async getSubTree(path: string): Promise<FolderTreeNode[]> {
    try {
      const items = await this.ls(path);
      const folders = items.filter((item) => item.type === 'dir') as FolderNode[];

      const children: FolderTreeNode[] = [];
      for (const folder of folders) {
        const child: FolderTreeNode = {
          ...folder,
          children: await this.getSubTree(folder.path),
        };
        children.push(child);
      }

      return children;
    } catch (err) {
      console.warn(`Failed to get subtree for ${path}:`, err);
      return [];
    }
  }

  /**
   * Exports all files on C: drive as a ZIP blob, excluding specified paths.
   * Uses @zip.js/zip.js for browser-native ZIP creation.
   */
  async exportStorage(excludePaths: string[] = []): Promise<Blob> {
    await this.init();
    const { BlobWriter, ZipWriter } = await import('@zip.js/zip.js');

    const normalizedExcludes = excludePaths.map((p) => this.normalize(p));
    const allNodes = await this.getAllIDBNodes();

    const zipWriter = new ZipWriter(new BlobWriter('application/zip'));

    for (const node of allNodes) {
      // Skip excluded paths
      if (normalizedExcludes.some((ep) => node.path === ep || node.path.startsWith(ep + '/'))) {
        continue;
      }

      // Only export C: drive internal files
      if (!node.path.startsWith('C:')) continue;

      // Strip the C:/ prefix for the zip entry name
      const entryName = node.path.slice(3); // removes "C:/"

      if (node.type === 'dir') {
        await zipWriter.add(entryName + '/', new (await import('@zip.js/zip.js')).BlobReader(new Blob([])), { directory: true });
      } else if (node.type === 'file') {
        let blob: Blob;
        if (node.content instanceof Blob || node.content instanceof File) {
          blob = node.content;
        } else if (node.content instanceof ArrayBuffer) {
          blob = new Blob([node.content]);
        } else if (typeof node.content === 'string') {
          blob = new Blob([node.content], { type: 'text/plain' });
        } else {
          blob = new Blob([]);
        }
        await zipWriter.add(entryName, new (await import('@zip.js/zip.js')).BlobReader(blob));
      }
    }

    return await zipWriter.close();
  }

  /**
   * Imports storage from a ZIP blob, writing entries as files/dirs into C: drive IDB.
   */
  async importStorage(zipBlob: Blob): Promise<void> {
    await this.init();
    const { BlobReader, ZipReader } = await import('@zip.js/zip.js');

    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      const fullPath = 'C:/' + entry.filename.replace(/\/$/, '');
      if (!fullPath || fullPath === 'C:') continue;

      if (entry.directory) {
        await this.mkdir(fullPath);
      } else {
        // Ensure parent dir exists
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (parentPath && parentPath !== 'C:') {
          const parentExists = await this.exists(parentPath);
          if (!parentExists) await this.mkdir(parentPath);
        }

        if (entry.getData) {
          const { BlobWriter } = await import('@zip.js/zip.js');
          const blob = await entry.getData(new BlobWriter());
          await this.writeFile(fullPath, blob);
        }
      }
    }

    await zipReader.close();
  }

  /**
   * Clears all files on C: drive except excluded paths.
   * Does NOT delete the IDB database or mounts—only file entries.
   */
  async clearStorage(excludePaths: string[] = []): Promise<void> {
    await this.init();
    const normalizedExcludes = excludePaths.map((p) => this.normalize(p));

    const transaction = this.db!.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.openCursor();

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const nodePath: string = cursor.value.path;
          // Only clear C: drive entries
          if (nodePath.startsWith('C:')) {
            const isExcluded = normalizedExcludes.some(
              (ep) => nodePath === ep || nodePath.startsWith(ep + '/')
            );
            if (!isExcluded) {
              cursor.delete();
            }
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Returns all raw IDB node records for the files store.
   */
  private async getAllIDBNodes(): Promise<any[]> {
    const transaction = this.db!.transaction(STORE_FILES, 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private normalize(path: string): string {
    let p = path.replace(/\\/g, '/');
    if (p.endsWith('/') && p.length > 3) p = p.slice(0, -1);
    if (p === '/' || p === '') return '/';
    return p;
  }
}

/**
 * System-wide Singleton instance of the Virtual File System.
 * Expected to be `.init()`'d specifically during the Hardware sequence in `boot-sequencer.ts`.
 */
export const vfs = new VFS();
