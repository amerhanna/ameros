"use client";

import { HardDrive, Folder, File as FileIcon, FileText, Lock } from "lucide-react";
import { type VFSNode } from "@/lib/vfs";
import { ItemView } from "@/components/ItemView";
import { type ClipboardState } from "@/lib/clipboard";

interface FolderViewProps {
  items: VFSNode[];
  loading?: boolean;
  error?: string | null;
  clipboard?: ClipboardState | null;
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
  const getIcon = (item: VFSNode) => {
    const isDrive = item.path === "C:" || item.path.endsWith(":");

    if (isDrive) {
      return <HardDrive className="w-10 h-10 text-blue-600" />;
    }

    if (item.type === "dir") {
      return <Folder className="w-10 h-10 text-amber-400 fill-amber-400/20" />;
    }

    if (item.name.endsWith(".txt")) {
      return <FileText className="w-10 h-10 text-blue-400" />;
    }

    return <FileIcon className="w-10 h-10 text-slate-400" />;
  };

  const getStatusIcon = (item: VFSNode) =>
    item.status === "prompt" ? <Lock className="w-3 h-3 text-amber-500 fill-amber-500" /> : null;

  return (
    <ItemView<VFSNode>
      items={items}
      loading={loading}
      error={error}
      clipboard={clipboard}
      viewStyle={viewStyle}
      selectedKey={selectedPath}
      itemKey={(item) => item.path}
      itemLabel={(item) => item.name}
      getIcon={getIcon}
      getStatusIcon={getStatusIcon}
      onOpen={onOpen}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      onRetry={onRetry}
    />
  );
}
