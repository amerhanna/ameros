"use client"

import { useState, useEffect } from "react"
import { vfs, type VFSProperties } from "@/lib/vfs"
import { HardDrive, Folder, File as FileIcon, Clock, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

interface FilePropertiesProps {
  path: string
}

export function FileProperties({ path }: FilePropertiesProps) {
  const [props, setProps] = useState<VFSProperties | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProps = async () => {
      try {
        const p = await vfs.getProperties(path)
        setProps(p)
      } catch (err) {
        toast.error("Failed to load properties")
      } finally {
        setLoading(false)
      }
    }
    fetchProps()
  }, [path])

  if (loading) return <div className="p-4 text-center text-sm text-slate-500 italic">Calculating properties...</div>
  if (!props) return <div className="p-4 text-center text-red-500">Error loading properties</div>

  const name = props.path.split("/").pop() || props.path
  const isMount = vfs.isMountPoint(props.path)

  return (
    <div className="p-4 bg-[#f0f0f0] h-full overflow-auto space-y-4 text-xs sm:text-sm border-t border-white">
      <div className="flex items-center gap-4 border-b border-[#808080] pb-4">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
            {isMount ? <HardDrive className="w-10 h-10 text-blue-600" /> : 
             props.type === 'dir' ? <Folder className="w-10 h-10 text-amber-400" /> : 
             <FileIcon className="w-10 h-10 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{name}</div>
          <div className="text-slate-500 text-[10px] break-all">{props.path}</div>
        </div>
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-y-2 text-[11px]">
        <div className="text-slate-500 font-medium">Type:</div>
        <div>{props.type === "dir" ? "Folder" : "File"}</div>

        <div className="text-slate-500 font-medium">Location:</div>
        <div className="truncate">{props.path.substring(0, props.path.lastIndexOf("/")) || "Root"}</div>

        <div className="text-slate-500 font-medium">Size:</div>
        <div className="font-semibold">{(props.size / 1024).toFixed(2)} KB ({props.size} bytes)</div>
      </div>

      <div className="pt-2 border-t border-[#808080]">
        <div className="grid grid-cols-[80px_1fr] gap-y-2 text-[11px]">
          <div className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Modified:
          </div>
          <div>{new Date(props.lastModified).toLocaleString()}</div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#808080]">
        <div className="flex items-center gap-2 text-xs">
          {props.readOnly ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Unlock className="w-3.5 h-3.5 text-green-500" />}
          <span className="font-medium uppercase tracking-tight">
            {props.readOnly ? "Read Only Access" : "Full Write Access"}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 mt-1 italic">
          {props.readOnly 
            ? "This file is part of a mounted drive with restricted permissions." 
            : "You have full binary access to this storage node."}
        </p>
      </div>
    </div>
  )
}
