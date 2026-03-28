"use client"

/**
 * AmerOS Virtual File System (VFS)
 * Persists to IndexedDB and supports external directory mounting via File System Access API.
 */

export interface VFSNode {
  path: string
  name: string
  type: "file" | "dir"
  content?: string | ArrayBuffer
  lastModified: number
  handle?: FileSystemHandle // For mounted external files/dirs
}

const DB_NAME = "AmerOS_VFS"
const DB_VERSION = 1
const STORE_FILES = "files"
const STORE_MOUNTS = "mounts"

class VFS {
  private db: IDBDatabase | null = null
  private mounts: Record<string, FileSystemDirectoryHandle> = {}

  async init() {
    if (this.db) return

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: "path" })
        }
        if (!db.objectStoreNames.contains(STORE_MOUNTS)) {
          db.createObjectStore(STORE_MOUNTS, { keyPath: "letter" })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await this.loadMounts()
    await this.ensureInitialBoot()
  }

  private async loadMounts() {
    const transaction = this.db!.transaction(STORE_MOUNTS, "readonly")
    const store = transaction.objectStore(STORE_MOUNTS)
    const request = store.getAll()

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result
        results.forEach((m: { letter: string; handle: FileSystemDirectoryHandle }) => {
          this.mounts[m.letter] = m.handle
        })
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async ensureInitialBoot() {
    const readme = await this.exists("C:/readme.txt")
    if (!readme) {
      await this.mkdir("C:/Windows")
      await this.mkdir("C:/Documents")
      await this.writeFile("C:/readme.txt", "Welcome to AmerOS!\n\nThis is your persistent Virtual File System.\nYou can also mount local folders to this OS using the File Explorer.")
    }
  }

  async exists(path: string): Promise<boolean> {
    const node = await this.getNode(path)
    return !!node
  }

  private async getNode(path: string): Promise<VFSNode | null> {
    const normalizedPath = this.normalize(path)
    if (normalizedPath === "C:") return { path: "C:", name: "C:", type: "dir", lastModified: 0 }

    // Handle mounted drives
    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/)
    if (driveMatch) {
      const letter = driveMatch[1]
      const subPath = driveMatch[2] || "/"
      if (letter !== "C" && this.mounts[letter]) {
        // Resolve from handle
        return this.getMountedNode(letter, subPath)
      }
    }

    // Handle C: (IDB)
    const transaction = this.db!.transaction(STORE_FILES, "readonly")
    const store = transaction.objectStore(STORE_FILES)
    const request = store.get(normalizedPath)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async ls(path: string): Promise<VFSNode[]> {
    const normalizedPath = this.normalize(path)

    // Root listing
    if (normalizedPath === "" || normalizedPath === "/") {
      const drives: VFSNode[] = [{ path: "C:", name: "Local Disk (C:)", type: "dir", lastModified: 0 }]
      Object.keys(this.mounts).forEach((letter) => {
        drives.push({ path: `${letter}:`, name: `Mounted Folder (${letter}:)`, type: "dir", lastModified: 0 })
      })
      return drives
    }

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/)
    if (driveMatch) {
      const letter = driveMatch[1]
      const subPath = driveMatch[2] || "/"

      if (letter === "C") {
        return this.lsIDB(normalizedPath)
      } else if (this.mounts[letter]) {
        return this.lsMounted(letter, subPath)
      }
    }

    return []
  }

  private async lsIDB(path: string): Promise<VFSNode[]> {
    const transaction = this.db!.transaction(STORE_FILES, "readonly")
    const store = transaction.objectStore(STORE_FILES)
    const request = store.openCursor()
    const results: VFSNode[] = []

    const prefix = path.endsWith("/") ? path : path + "/"

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const nodePath = cursor.value.path
          if (nodePath.startsWith(prefix)) {
            const relativePart = nodePath.slice(prefix.length)
            // Only immediate children
            if (!relativePart.includes("/") || (relativePart.endsWith("/") && relativePart.split("/").length <= 2)) {
              results.push(cursor.value)
            }
          }
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async lsMounted(letter: string, subPath: string): Promise<VFSNode[]> {
    const rootHandle = this.mounts[letter]
    let currentHandle: FileSystemDirectoryHandle = rootHandle

    const parts = subPath.split("/").filter(Boolean)
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part)
    }

    const results: VFSNode[] = []
    for await (const entry of currentHandle.values()) {
      results.push({
        path: `${letter}:${subPath === "/" ? "" : subPath}/${entry.name}`,
        name: entry.name,
        type: entry.kind === "directory" ? "dir" : "file",
        lastModified: Date.now(),
        handle: entry,
      })
    }
    return results
  }

  private async getMountedNode(letter: string, subPath: string): Promise<VFSNode | null> {
    if (subPath === "/" || subPath === "") {
        return { path: `${letter}:`, name: `${letter}:`, type: "dir", lastModified: 0 }
    }
    
    const rootHandle = this.mounts[letter]
    const parts = subPath.split("/").filter(Boolean)
    const fileName = parts.pop()!
    let currentHandle: FileSystemDirectoryHandle = rootHandle

    try {
      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part)
      }
      
      // Check if it's a file or directory
      try {
        const fileHandle = await currentHandle.getFileHandle(fileName)
        return {
            path: `${letter}:${subPath}`,
            name: fileName,
            type: 'file',
            lastModified: (await fileHandle.getFile()).lastModified,
            handle: fileHandle
        }
      } catch {
        const dirHandle = await currentHandle.getDirectoryHandle(fileName)
        return {
            path: `${letter}:${subPath}`,
            name: fileName,
            type: 'dir',
            lastModified: 0,
            handle: dirHandle
        }
      }
    } catch {
      return null
    }
  }

  async readFile(path: string): Promise<string | ArrayBuffer> {
    const node = await this.getNode(path)
    if (!node) throw new Error("File not found")

    if (node.handle && node.type === "file") {
      const file = await (node.handle as FileSystemFileHandle).getFile()
      return await file.text()
    }

    return node.content || ""
  }

  async writeFile(path: string, content: string | ArrayBuffer) {
    const normalizedPath = this.normalize(path)
    const name = normalizedPath.split("/").pop()!

    const transaction = this.db!.transaction(STORE_FILES, "readwrite")
    const store = transaction.objectStore(STORE_FILES)
    const node: VFSNode = {
      path: normalizedPath,
      name,
      type: "file",
      content,
      lastModified: Date.now(),
    }
    store.put(node)

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async mkdir(path: string) {
    const normalizedPath = this.normalize(path)
    const name = normalizedPath.split("/").pop()!

    const transaction = this.db!.transaction(STORE_FILES, "readwrite")
    const store = transaction.objectStore(STORE_FILES)
    const node: VFSNode = {
      path: normalizedPath,
      name,
      type: "dir",
      lastModified: Date.now(),
    }
    store.put(node)

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async mountFolder(handle: FileSystemDirectoryHandle): Promise<string> {
    const letters = "DEFGHIJKLMNOPQRSTUVWXYZ".split("")
    const usedLetters = Object.keys(this.mounts)
    const nextLetter = letters.find((l) => !usedLetters.includes(l))

    if (!nextLetter) throw new Error("No available drive letters")

    this.mounts[nextLetter] = handle

    const transaction = this.db!.transaction(STORE_MOUNTS, "readwrite")
    const store = transaction.objectStore(STORE_MOUNTS)
    store.put({ letter: nextLetter, handle })

    return new Promise<string>((resolve, reject) => {
      transaction.oncomplete = () => resolve(nextLetter)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  getMounts() {
    return Object.keys(this.mounts).map(letter => ({
        letter,
        handle: this.mounts[letter]
    }));
  }

  private normalize(path: string): string {
    let p = path.replace(/\\/g, "/")
    if (p.endsWith("/") && p.length > 3) p = p.slice(0, -1)
    return p
  }
}

export const vfs = new VFS()
