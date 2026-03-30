"use client"

/**
 * AmerOS Virtual File System (VFS) - Phase 2
 * Persists to IndexedDB and supports external directory mounting via File System Access API.
 * Supports recursive operations, cross-drive transfers (C: <=> D:), and volume labels.
 */

export interface VFSNode {
  path: string
  name: string
  type: "file" | "dir"
  content?: string | ArrayBuffer | Blob | File
  lastModified: number
  handle?: FileSystemHandle // For mounted external files/dirs
}

export interface VFSMount {
  letter: string
  handle: FileSystemDirectoryHandle
  label?: string
}

export interface VFSProperties {
  size: number
  lastModified: number
  type: "file" | "dir"
  readOnly: boolean
  path: string
}

type FileSystemPermissionMode = 'read' | 'readwrite'

const DB_NAME = "AmerOS_VFS"
const DB_VERSION = 2
const STORE_FILES = "files"
const STORE_MOUNTS = "mounts"

class VFS {
  private db: IDBDatabase | null = null
  private mounts: Record<string, VFSMount> = {}

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
        // In DB_VERSION 2, we just ensure the mounts store exists. 
        // IndexedDB handle-storage implicitly handles schema-less objects.
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
        results.forEach((m: VFSMount) => {
          this.mounts[m.letter] = m
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
      await this.setVolumeLabel("C", "AmerOS Boot")
    }
  }

  async exists(path: string): Promise<boolean> {
    const node = await this.getNode(path)
    return !!node
  }

  private async getNode(path: string): Promise<VFSNode | null> {
    const normalizedPath = this.normalize(path)
    if (normalizedPath === "C:") return { path: "C:", name: "C:", type: "dir", lastModified: 0 }

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/)
    if (driveMatch) {
      const letter = driveMatch[1]
      const subPath = driveMatch[2] || "/"
      if (letter !== "C" && this.mounts[letter]) {
        return this.getMountedNode(letter, subPath)
      }
    }

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

    if (normalizedPath === "" || normalizedPath === "/" || normalizedPath === "This PC") {
      const drives: VFSNode[] = [{ path: "C:", name: this.mounts["C"]?.label || "Local Disk (C:)", type: "dir", lastModified: 0 }]
      Object.keys(this.mounts).forEach((letter) => {
        if (letter !== "C") {
          drives.push({ path: `${letter}:`, name: this.mounts[letter].label || `Mounted Folder (${letter}:)`, type: "dir", lastModified: 0 })
        }
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
    const rootHandle = this.mounts[letter].handle
    let currentHandle: FileSystemDirectoryHandle = rootHandle

    const parts = subPath.split("/").filter(Boolean)
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part)
    }

    const results: VFSNode[] = []
    
    try {
      for await (const entry of (currentHandle as any).values()) {
        try {
          results.push({
            path: `${letter}:${subPath === "/" ? "" : subPath}/${entry.name}`,
            name: entry.name,
            type: entry.kind === "directory" ? "dir" : "file",
            lastModified: Date.now(),
            handle: entry,
          })
        } catch (entryErr) {
          console.error(`VFS: Failed to process entry in ${letter}:${subPath}. This is likely due to illegal Windows filenames (e.g. leading spaces).`, entryErr)
        }
      }
    } catch (enumErr) {
      console.error(`VFS: Directory enumeration failed for ${letter}:${subPath}.`, enumErr)
      throw new Error("Unable to read directory content. Windows may be blocking access to these filenames.")
    }
    return results
  }

  private async getMountedNode(letter: string, subPath: string): Promise<VFSNode | null> {
    if (subPath === "/" || subPath === "") {
        return { path: `${letter}:`, name: `${letter}:`, type: "dir", lastModified: 0 }
    }
    
    const rootHandle = this.mounts[letter].handle
    const parts = subPath.split("/").filter(Boolean)
    const fileName = parts.pop()!
    let currentHandle: FileSystemDirectoryHandle = rootHandle

    try {
      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part)
      }
      
      try {
        const fileHandle = await currentHandle.getFileHandle(fileName)
        const fileObj = await fileHandle.getFile()
        return {
            path: `${letter}:${subPath}`,
            name: fileName,
            type: 'file',
            lastModified: fileObj.lastModified,
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

  async readFile(path: string): Promise<string | ArrayBuffer | Blob | File> {
    const node = await this.getNode(path)
    if (!node) throw new Error("File not found")

    if (node.handle && node.type === "file") {
      const file = await (node.handle as FileSystemFileHandle).getFile()
      return file
    }

    return node.content || ""
  }

  async writeFile(path: string, content: string | ArrayBuffer | Blob | File) {
    const normalizedPath = this.normalize(path)
    const name = normalizedPath.split("/").pop()!

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/)
    if (driveMatch) {
      const letter = driveMatch[1]
      const subPath = driveMatch[2] || "/"
      if (letter !== "C" && this.mounts[letter]) {
        // Write to external
        return this.writeExternal(letter, subPath, content)
      }
    }

    // Write to IDB
    const transaction = this.db!.transaction(STORE_FILES, "readwrite")
    const store = transaction.objectStore(STORE_FILES)
    
    // Ensure content is stored efficiently
    let finalContent = content
    if (typeof content === "string") {
      finalContent = new Blob([content], { type: "text/plain" })
    }

    const node: VFSNode = {
      path: normalizedPath,
      name,
      type: "file",
      content: finalContent,
      lastModified: Date.now(),
    }
    store.put(node)

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  private async writeExternal(letter: string, subPath: string, content: any) {
    const rootHandle = this.mounts[letter].handle
    const parts = subPath.split("/").filter(Boolean)
    const fileName = parts.pop()!
    let currentHandle: FileSystemDirectoryHandle = rootHandle

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: true })
    }

    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true })
    const writable = await (fileHandle as any).createWritable()
    await writable.write(content)
    await writable.close()
  }

  async mkdir(path: string) {
    const normalizedPath = this.normalize(path)
    const name = normalizedPath.split("/").pop()!

    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/)
    if (driveMatch) {
        const letter = driveMatch[1]
        const subPath = driveMatch[2] || "/"
        if (letter !== "C" && this.mounts[letter]) {
            const rootHandle = this.mounts[letter].handle
            const parts = subPath.split("/").filter(Boolean)
            let currentHandle = rootHandle
            for (const part of parts) {
                currentHandle = await currentHandle.getDirectoryHandle(part, { create: true })
            }
            return
        }
    }

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

  async touch(path: string) {
    if (!(await this.exists(path))) {
      await this.writeFile(path, new Blob([], { type: "application/octet-stream" }))
    }
  }

  async delete(path: string) {
    const normalizedPath = this.normalize(path)
    
    const driveMatch = normalizedPath.match(/^([A-Z]):(.*)/)
    if (driveMatch) {
      const letter = driveMatch[1]
      const subPath = driveMatch[2] || "/"
      if (letter !== "C" && this.mounts[letter]) {
        return this.deleteExternal(letter, subPath)
      }
    }

    // IDB Deletion (Recursive)
    const transaction = this.db!.transaction(STORE_FILES, "readwrite")
    const store = transaction.objectStore(STORE_FILES)
    
    // Find all children
    const prefix = normalizedPath.endsWith("/") ? normalizedPath : normalizedPath + "/"
    const request = store.openCursor()

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const nodePath = cursor.value.path
          if (nodePath === normalizedPath || nodePath.startsWith(prefix)) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async deleteExternal(letter: string, subPath: string) {
    const rootHandle = this.mounts[letter].handle
    if (subPath === "/" || subPath === "") throw new Error("Cannot delete drive root")

    const parts = subPath.split("/").filter(Boolean)
    const name = parts.pop()!
    let currentHandle = rootHandle
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part)
    }

    await (currentHandle as any).removeEntry(name, { recursive: true })
  }

  async rename(path: string, newName: string) {
    const normalizedPath = this.normalize(path)
    const node = await this.getNode(normalizedPath)
    if (!node) throw new Error("Source not found")

    const lastSlash = normalizedPath.lastIndexOf("/")
    const parentPath = normalizedPath.substring(0, lastSlash) || (normalizedPath.includes(":") ? normalizedPath.split(":")[0] + ":" : "/")
    const newPath = this.normalize(`${parentPath}/${newName}`)

    if (node.handle) {
      if (node.type === "file") {
        if ((node.handle as any).move) {
          await (node.handle as any).move(newName)
          return
        }
      } else {
        // Folders on external handles don't support .move()
        // We must bridge this with copy + delete
        await this.copy(normalizedPath, newPath)
        await this.delete(normalizedPath)
        return
      }
      throw new Error("Native rename not supported for this handle")
    }

    // IDB Rename (Recursive for dirs)
    // We collect all nodes first to avoid cursor mutation issues
    const transaction = this.db!.transaction(STORE_FILES, "readwrite")
    const store = transaction.objectStore(STORE_FILES)
    const prefix = normalizedPath + "/"
    const nodesToUpdate: { oldPath: string, newNode: VFSNode }[] = []

    const cursorRequest = store.openCursor()
    await new Promise<void>((resolve, reject) => {
        cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const oldChildPath = cursor.value.path
          if (oldChildPath === normalizedPath) {
             nodesToUpdate.push({ oldPath: oldChildPath, newNode: { ...cursor.value, path: newPath, name: newName } })
          } else if (oldChildPath.startsWith(prefix)) {
             const relative = oldChildPath.slice(prefix.length)
             const newChildPath = newPath + "/" + relative
             nodesToUpdate.push({ oldPath: oldChildPath, newNode: { ...cursor.value, path: newChildPath } })
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      cursorRequest.onerror = () => reject(cursorRequest.error)
    })

    // Apply collected updates
    for (const update of nodesToUpdate) {
      await store.delete(update.oldPath)
      await store.put(update.newNode)
    }

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async copy(src: string, dest: string) {
    const srcNode = await this.getNode(src)
    if (!srcNode) throw new Error("Source not found")

    if (srcNode.type === "dir") {
      await this.mkdir(dest)
      const children = await this.ls(src)
      for (const child of children) {
        await this.copy(child.path, `${dest}/${child.name}`)
      }
      return
    }

    // File copy
    const content = await this.readFile(src)
    await this.writeFile(dest, content)
  }

  async move(src: string, dest: string) {
    const srcDrive = src.split(":")[0]
    const destDrive = dest.split(":")[0]
    const srcNode = await this.getNode(src)
    if (!srcNode) throw new Error("Source not found")
    
    // Within same external drive
    if (srcDrive === destDrive && srcNode.handle) {
        const newName = dest.split("/").pop()!
        const destParentPath = dest.substring(0, dest.lastIndexOf("/")) || (dest.includes(":") ? dest.split(":")[0] + ":" : "/")
        const destParentNode = await this.getNode(destParentPath)

        // Native File System API supports atomic move for files if both handle and parent are known
        if (srcNode.type === "file" && (srcNode.handle as any).move && destParentNode?.handle) {
             await (srcNode.handle as any).move(destParentNode.handle, newName)
             return
        }
        // Folder or no native support fallback
        await this.copy(src, dest)
        await this.delete(src)
        return
    }

    // Default: Bridge Copy & Delete
    await this.copy(src, dest)
    await this.delete(src)
  }

  async getSize(path: string): Promise<number> {
    const node = await this.getNode(path)
    if (!node) return 0

    if (node.type === "file") {
      if (node.handle) {
          const file = await (node.handle as FileSystemFileHandle).getFile()
          return file.size
      }
      if (node.content instanceof Blob || node.content instanceof File) return node.content.size
      if (node.content instanceof ArrayBuffer) return node.content.byteLength
      return (node.content as string || "").length
    }

    // Directory size (recursive)
    const children = await this.ls(path)
    let total = 0
    for (const child of children) {
      total += await this.getSize(child.path)
    }
    return total
  }

  async getProperties(path: string): Promise<VFSProperties> {
    const node = await this.getNode(path)
    if (!node) throw new Error("Not found")

    const size = await this.getSize(path)
    let readOnly = false

    if (node.handle) {
      const mode = 'readwrite' as FileSystemPermissionMode
      const status = await (node.handle as any).queryPermission({ mode })
      readOnly = status !== 'granted'
    }

    return {
      size,
      lastModified: node.lastModified,
      type: node.type,
      readOnly,
      path: node.path
    }
  }

  async setVolumeLabel(letter: string, label: string) {
    if (letter === "C") {
      const transaction = this.db!.transaction(STORE_MOUNTS, "readwrite")
      const store = transaction.objectStore(STORE_MOUNTS)
      store.put({ letter: "C", handle: null as any, label }) // Virtual handle for C
      this.mounts["C"] = { letter: "C", handle: null as any, label }
      return
    }

    if (!this.mounts[letter]) return
    this.mounts[letter].label = label
    const transaction = this.db!.transaction(STORE_MOUNTS, "readwrite")
    const store = transaction.objectStore(STORE_MOUNTS)
    store.put(this.mounts[letter])
  }

  async getVolumeLabel(letter: string): Promise<string> {
    return this.mounts[letter]?.label || (letter === "C" ? "Local Disk" : "Removable Disk")
  }

  async mountFolder(handle: FileSystemDirectoryHandle): Promise<string> {
    const letters = "DEFGHIJKLMNOPQRSTUVWXYZ".split("")
    const usedLetters = Object.keys(this.mounts)
    const nextLetter = letters.find((l) => !usedLetters.includes(l))

    if (!nextLetter) throw new Error("No available drive letters")

    const mount: VFSMount = { letter: nextLetter, handle, label: handle.name }
    this.mounts[nextLetter] = mount

    const transaction = this.db!.transaction(STORE_MOUNTS, "readwrite")
    const store = transaction.objectStore(STORE_MOUNTS)
    store.put(mount)

    return new Promise<string>((resolve, reject) => {
      transaction.oncomplete = () => resolve(nextLetter)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  getMounts() {
    return Object.keys(this.mounts).map(letter => this.mounts[letter]);
  }

  private normalize(path: string): string {
    let p = path.replace(/\\/g, "/")
    if (p.endsWith("/") && p.length > 3) p = p.slice(0, -1)
    if (p === "/" || p === "") return "This PC" // Root alias
    return p
  }
}

export const vfs = new VFS()
