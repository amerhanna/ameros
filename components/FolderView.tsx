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
  viewStyle?: "grid" | "list" | "details";
  selectedPath?: string | null;
  onOpen: (item: VFSNode) => void;
  onSelect?: (item: VFSNode) => void;
  onContextMenu: (e: React.MouseEvent, item: VFSNode | null) => void;
  onRetry?: () => void;
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const formatFileType = (name: string, path: string, type: string) => {
  if (type === "dir") return "File Folder";
  if (type === "drive") {
    if (path === "C:") return "Internal Storage";
    return "Mounted Drive";
  }
  const ext = name.split(".").pop()?.toUpperCase() || "";
  return ext ? `${ext} File` : "File";
};

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

  const getStatusIcon = (item: VFSNode) => (item.status === "prompt" ? <Lock className="w-3 h-3 text-amber-500 fill-amber-500" /> : null);

  return (
    <ItemView<VFSNode>
      items={items}
      loading={loading}
      error={error}
      columnNames={viewStyle === "details" ? ["Name", "Type", "Last Modified", "Size"] : undefined}
      detailsMapper={
        viewStyle === "details" ? (item) => [formatFileType(item.name, item.path, item.type), formatDate(item.lastModified), "not implemented yet"] : undefined
      }
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
