"use client"

import { useState, useEffect, useCallback } from "react"
import { useSystemActions } from "@/hooks/useSystemActions"
import { useWindowActions } from "@/hooks/useWindowActions"
import { vfs, type VFSNode } from "@/lib/vfs"
import { type MenuItemType } from "@/components/WindowManager/Menu"
import ContextMenu from "@/components/WindowManager/ContextMenu"
import { toast } from "sonner"

// Internal Components
import { FolderView } from "./components/FolderView"
import { NameInputDialog } from "./components/NameInputDialog"
import { FileProperties } from "./components/FileProperties"
import { Toolbar } from "./components/Toolbar"
import { StatusBar } from "./components/StatusBar"

export default function FileExplorer() {
  const { launchApp } = useSystemActions()
  const { openChildWindow } = useWindowActions()
  const [currentPath, setCurrentPath] = useState("/")
  const [items, setItems] = useState<VFSNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<{ path: string; operation: "copy" | "move" } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: VFSNode | null } | null>(null)

  const initVFS = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await vfs.init()
      const content = await vfs.ls(currentPath)
      setItems(content)
    } catch (err) {
      setError((err as Error).message)
      toast.error("VFS Error: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    initVFS()
  }, [initVFS])

  const handleOpen = async (node: VFSNode) => {
    if (node.type === "dir") {
      setCurrentPath(node.path)
    } else {
      if (node.name.toLowerCase().endsWith(".txt")) {
        try {
          const content = await vfs.readFile(node.path)
          const textContent = content instanceof Blob ? await content.text() : 
                               content instanceof ArrayBuffer ? new TextDecoder().decode(content) : 
                               typeof content === 'string' ? content : ""
                               
          launchApp("TextEditor", {
            title: `${node.name} - Text Editor`,
            launchArgs: { 
              filePath: node.path,
              initialContent: textContent
            },
          })
        } catch (err) {
          toast.error("Failed to read file")
        }
      } else {
        toast("File type not supported", { description: "Opening binary files is coming soon!" })
      }
    }
  }

  const handleBack = () => {
    if (currentPath === "/" || currentPath === "" || currentPath === "This PC") return
    
    // If it's a drive root like "C:", go to "This PC"
    if (currentPath.match(/^[A-Z]:$/)) {
      setCurrentPath("This PC")
      return
    }

    const lastSlash = currentPath.lastIndexOf("/")
    if (lastSlash === -1) {
       setCurrentPath("This PC")
    } else {
       const newPath = currentPath.substring(0, lastSlash)
       setCurrentPath(newPath || (currentPath.includes(":") ? currentPath.split(":")[0] + ":" : "This PC"))
    }
  }

  const handleMount = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker()
      await vfs.mountFolder(handle)
      initVFS()
      toast.success("Folder mounted successfully")
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Mount failed", err)
        toast.error("Failed to mount folder")
      }
    }
  }

  // --- Context Menu Actions ---

  const handleDelete = async (path: string) => {
    try {
      await vfs.delete(path)
      initVFS()
      toast.success("Deleted successfully")
    } catch (err) {
      toast.error("Failed to delete")
    }
  }

  const handleRename = (path: string) => {
    const oldName = path.split("/").pop() || ""
    openChildWindow({
      title: "Rename",
      component: () => (
        <NameInputDialog 
          initialValue={oldName} 
          label={`Enter new name for '${oldName}':`}
          onConfirm={async (newName) => {
            try {
              await vfs.rename(path, newName)
              initVFS()
              toast.success("Renamed successful")
            } catch (err) {
              toast.error("Failed to rename")
            }
          }}
        />
      ),
      width: 300,
      height: 150,
      modal: true,
      resizable: false,
    })
  }

  const handleNewFolder = () => {
    openChildWindow({
      title: "New Folder",
      component: () => (
        <NameInputDialog 
          initialValue="New Folder" 
          label="Enter name for new folder:"
          onConfirm={async (name) => {
            try {
                const path = currentPath === "This PC" ? "C:" : currentPath
              await vfs.mkdir(`${path}/${name}`)
              initVFS()
              toast.success("Folder created")
            } catch (err) {
              toast.error("Failed to create folder")
            }
          }}
        />
      ),
      width: 300,
      height: 150,
      modal: true,
      resizable: false,
    })
  }

  const handleNewFile = () => {
    openChildWindow({
      title: "New File",
      component: () => (
        <NameInputDialog 
          initialValue="New Text Document.txt" 
          label="Enter name for new file:"
          onConfirm={async (name) => {
            try {
              const path = currentPath === "This PC" ? "C:" : currentPath
              await vfs.touch(`${path}/${name}`)
              initVFS()
              toast.success("File created")
            } catch (err) {
              toast.error("Failed to create file")
            }
          }}
        />
      ),
      width: 300,
      height: 150,
      modal: true,
      resizable: false,
    })
  }

  const handleCut = (path: string) => {
    setClipboard({ path, operation: "move" })
    toast.info("Item cut to clipboard")
  }

  const handleCopy = (path: string) => {
    setClipboard({ path, operation: "copy" })
    toast.info("Item copied to clipboard")
  }

  const handlePaste = async () => {
    if (!clipboard) return
    const name = clipboard.path.split("/").pop() || "unknown"
    const dest = `${currentPath}/${name}`
    
    try {
      if (clipboard.operation === "copy") {
        await vfs.copy(clipboard.path, dest)
      } else {
        await vfs.move(clipboard.path, dest)
        setClipboard(null) // Clear cut clipboard
      }
      initVFS()
      toast.success(`Pasted into ${currentPath}`)
    } catch (err) {
      toast.error("Failed to paste items")
    }
  }

  const handleProperties = (path: string) => {
    openChildWindow({
      title: "Properties",
      component: () => <FileProperties path={path} />,
      width: 320,
      height: 420,
      modal: false,
      resizable: false,
      maximizable: false,
      minimizable: false
    })
  }

  const handleContextMenu = (e: React.MouseEvent, item: VFSNode | null) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const closeContextMenu = () => setContextMenu(null)

  // --- Render logic ---

  const driveMenuItems: MenuItemType[] = [
    { type: 'item', label: 'Open', action: () => handleOpen(contextMenu!.item!), icon: '📁' },
    { type: 'separator' },
    { type: 'item', label: 'Rename', action: () => handleRename(contextMenu!.item!.path) },
    { type: 'item', label: 'Properties', action: () => handleProperties(contextMenu!.item!.path), icon: 'ℹ️' },
  ]

  const fileMenuItems: MenuItemType[] = [
    { type: 'item', label: 'Open', action: () => handleOpen(contextMenu!.item!), bold: true },
    { type: 'separator' },
    { type: 'item', label: 'Cut', action: () => handleCut(contextMenu!.item!.path), icon: '✂️' },
    { type: 'item', label: 'Copy', action: () => handleCopy(contextMenu!.item!.path), icon: '📋' },
    { type: 'separator' },
    { type: 'item', label: 'Delete', action: () => handleDelete(contextMenu!.item!.path), icon: '🗑️' },
    { type: 'item', label: 'Rename', action: () => handleRename(contextMenu!.item!.path) },
    { type: 'separator' },
    { type: 'item', label: 'Properties', action: () => handleProperties(contextMenu!.item!.path), icon: 'ℹ️' },
  ]

  const emptySpaceMenuItems: MenuItemType[] = [
    { type: 'item', label: 'Paste', action: handlePaste, disabled: !clipboard, icon: '📥' },
    { type: 'separator' },
    { type: 'item', label: 'New Folder', action: handleNewFolder, icon: '📁' },
    { type: 'item', label: 'New File', action: handleNewFile, icon: '📄' },
    { type: 'item', label: 'Refresh', action: initVFS, icon: '🔄' },
  ]

  return (
    <div 
      className="flex flex-col h-full bg-[#f0f0f0] text-slate-900 font-sans select-none border border-[#808080]"
      onClick={closeContextMenu}
    >
      <Toolbar 
        currentPath={currentPath}
        canGoBack={currentPath !== "This PC"}
        onBack={handleBack}
        onMount={handleMount}
      />

      <div className="flex-1 overflow-hidden bg-white m-1 border border-[#808080] shadow-inner relative">
        <FolderView 
          items={items}
          loading={loading}
          error={error}
          clipboard={clipboard}
          onOpen={handleOpen}
          onContextMenu={handleContextMenu}
          onRetry={initVFS}
        />

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={
              !contextMenu.item ? emptySpaceMenuItems : 
              (contextMenu.item.path === "C:" || contextMenu.item.path.endsWith(":")) ? driveMenuItems : 
              fileMenuItems
            }
            onDismiss={closeContextMenu}
          />
        )}
      </div>
      
      <StatusBar 
        itemCount={items.length}
        clipboard={clipboard}
        currentPath={currentPath}
      />
    </div>
  )
}
