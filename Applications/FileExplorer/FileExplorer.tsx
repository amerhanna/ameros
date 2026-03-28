"use client"

import { useState, useEffect } from "react"
import { useSystemActions } from "@/hooks/useSystemActions"
import { vfs, type VFSNode } from "@/lib/vfs"
import { Button } from "@/components/ui/button"
import { Folder, File, ChevronLeft, HardDrive, PlusCircle, Monitor } from "lucide-react"

export default function FileExplorer() {
  const { launchApp } = useSystemActions()
  const [currentPath, setCurrentPath] = useState("/")
  const [items, setItems] = useState<VFSNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initVFS = async () => {
      setLoading(true)
      await vfs.init()
      const content = await vfs.ls(currentPath)
      setItems(content)
      setLoading(false)
    }
    initVFS()
  }, [currentPath])

  const handleOpen = async (node: VFSNode) => {
    if (node.type === "dir") {
      setCurrentPath(node.path)
    } else {
      // It's a file
      if (node.name.toLowerCase().endsWith(".txt")) {
        const content = await vfs.readFile(node.path)
        launchApp("TextEditor", {
          title: `${node.name} - Text Editor`,
          launchArgs: { 
            filePath: node.path,
            initialContent: content
          },
        })
      }
    }
  }

  const handleBack = () => {
    if (currentPath === "/" || currentPath === "") return
    
    // If it's a drive root like "C:", go to "/"
    if (currentPath.match(/^[A-Z]:$/)) {
      setCurrentPath("/")
      return
    }

    const lastSlash = currentPath.lastIndexOf("/")
    if (lastSlash === -1) {
       // Should be a drive root or "/"
       setCurrentPath("/")
    } else {
       const newPath = currentPath.substring(0, lastSlash)
       setCurrentPath(newPath || (currentPath.includes(":") ? currentPath.split(":")[0] + ":" : "/"))
    }
  }

  const handleMount = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker()
      await vfs.mountFolder(handle)
      const content = await vfs.ls(currentPath)
      setItems(content)
    } catch (err) {
      console.error("Mount failed", err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] text-slate-900 font-sans select-none border border-[#808080]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-1.5 border-b bg-[#e1e1e1] shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          disabled={currentPath === "/"}
          className="h-8 w-8 hover:bg-[#c1c1c1] border border-transparent hover:border-[#808080]"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 px-3 py-1 bg-white border border-[#808080] text-sm truncate font-medium">
          {currentPath === "/" ? "This PC" : currentPath}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleMount} 
          className="gap-2 h-8 bg-[#e1e1e1] hover:bg-[#c1c1c1] border-[#808080]"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Mount Local Folder</span>
        </Button>
      </div>

      {/* Main View */}
      <div className="flex-1 overflow-auto bg-white m-1 border border-[#808080] shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
            <Monitor className="w-8 h-8 mr-2" />
            Reading Disk...
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] p-2">
            {items.map((item) => (
              <div
                key={item.path}
                className="flex flex-col items-center gap-1 p-2 rounded hover:bg-[#cce8ff] hover:border-[#99d1ff] border border-transparent cursor-pointer text-center group"
                onDoubleClick={() => handleOpen(item)}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  {item.path === "C:" || item.path.endsWith(":") ? (
                    <HardDrive className="w-10 h-10 text-blue-600" />
                  ) : item.type === "dir" ? (
                    <Folder className="w-10 h-10 text-amber-400 fill-amber-400/20" />
                  ) : (
                    <File className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <span className="text-[11px] leading-tight break-all line-clamp-2 px-1 text-slate-700">
                  {item.name}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-400 text-sm italic">
                This folder is empty.
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="px-2 py-0.5 bg-[#e1e1e1] border-t border-[#808080] text-[10px] text-slate-600 flex justify-between">
        <span>{items.length} items</span>
        <span>Virtual File System (VFS v1.0)</span>
      </div>
    </div>
  )
}
