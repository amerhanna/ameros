"use client"

import { Info } from "lucide-react"

interface StatusBarProps {
  itemCount: number
  clipboard: { path: string; operation: string } | null
  currentPath: string
}

export function StatusBar({ itemCount, clipboard, currentPath }: StatusBarProps) {
  const showWindowsWarning = currentPath.includes(":") && !currentPath.startsWith("C:")

  return (
    <div className="px-2 py-0.5 bg-[#e1e1e1] border-t border-[#808080] text-[10px] text-slate-600 flex justify-between">
      <div className="flex gap-4 items-center">
        <span>{itemCount} items</span>
        {clipboard && (
          <span className="text-blue-600 font-medium tracking-tight">
            Clipboard: Item {clipboard.operation === 'move' ? 'extracted' : 'copied'}
          </span>
        )}
        {showWindowsWarning && (
          <div className="flex items-center gap-1 text-amber-700 bg-amber-100 px-1 border border-amber-200">
            <Info className="w-3 h-3" />
            <span>Filenames with leading spaces are hidden by Windows</span>
          </div>
        )}
      </div>
      <span>AmerOS Explorer v1.1 - Phase 2 VFS</span>
    </div>
  )
}
