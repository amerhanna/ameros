"use client"

import { Info } from "lucide-react"

interface StatusBarProps {
  itemCount: number;
  clipboard: { path: string; operation: string } | null;
}

export function StatusBar({ itemCount, clipboard }: StatusBarProps) {
  return (
    <div className="px-2 py-0.5 bg-[#e1e1e1] border-t border-[#808080] text-[10px] text-slate-600 flex justify-between">
      <div className="flex gap-4 items-center">
        <span>{itemCount} items</span>
        {clipboard && (
          <span className="text-blue-600 font-medium tracking-tight">
            Clipboard: Item {clipboard.operation === "move" ? "extracted" : "copied"}
          </span>
        )}
      </div>
      <span>AmerOS Explorer v1.1 - Phase 2 VFS</span>
    </div>
  );
}
