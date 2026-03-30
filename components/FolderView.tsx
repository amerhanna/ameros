"use client";

import { HardDrive, Folder, File as FileIcon, FileText, Monitor, Info, Lock } from "lucide-react";
import { type VFSNode } from "@/lib/vfs";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FolderViewProps {
  items: VFSNode[];
  loading?: boolean;
  error?: string | null;
  clipboard?: { path: string; operation: "copy" | "move" } | null;
  viewStyle?: "grid" | "list";
  selectedPath?: string | null;
  onOpen: (item: VFSNode) => void;
  onSelect?: (item: VFSNode) => void;
  onContextMenu: (e: React.MouseEvent, item: VFSNode | null) => void;
  onRetry?: () => void;
}

export function FolderView({
  items,
  loading,
  error,
  clipboard,
  viewStyle = "grid",
  selectedPath,
  onOpen,
  onSelect,
  onContextMenu,
  onRetry,
}: FolderViewProps) {
  const [selectedItem, setSelectedItem] = useState<VFSNode | undefined>(items.find((item) => item.path === selectedPath));
  const handleSelect = (item: VFSNode) => {
    setSelectedItem(item);
    onSelect?.(item);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
        <Monitor className="w-8 h-8 mr-2" />
        Disk Operations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Info className="w-12 h-12 text-blue-500 mb-4" />
        <div className="text-sm font-bold text-slate-800 mb-2">Access Issue Detected</div>
        <div className="text-xs text-slate-500 max-w-xs">{error}</div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white" onContextMenu={(e) => onContextMenu(e, null)}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] p-2 content-start">
        {items.map((item) => {
          const isCut = clipboard?.path === item.path && clipboard.operation === "move";
          const isDrive = item.path === "C:" || item.path.endsWith(":");
          const isSelected = selectedItem?.path === item.path;

          return (
            <div
              key={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded border border-transparent cursor-pointer text-center group transition-opacity ${
                isCut ? "opacity-40" : ""
              } ${isSelected ? "bg-[#cce8ff] border-[#99d1ff]" : "hover:bg-[#e5f3ff] hover:border-[#cde8ff]"}`}
              onClick={() => handleSelect(item)}
              onDoubleClick={() => onOpen(item)}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, item);
              }}
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                {isDrive ? (
                  <HardDrive className="w-10 h-10 text-blue-600" />
                ) : item.type === "dir" ? (
                  <Folder className="w-10 h-10 text-amber-400 fill-amber-400/20" />
                ) : item.name.endsWith(".txt") ? (
                  <FileText className="w-10 h-10 text-blue-400" />
                ) : (
                  <FileIcon className="w-10 h-10 text-slate-400" />
                )}
                {item.status === "prompt" && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 animate-in zoom-in duration-300">
                    <Lock className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </div>
                )}
              </div>
              <span className="text-[11px] leading-tight break-all line-clamp-2 px-1 text-slate-700">{item.name}</span>
            </div>
          );
        })}

        {items.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 text-sm italic">This folder is empty.</div>}
      </div>
    </div>
  );
}
