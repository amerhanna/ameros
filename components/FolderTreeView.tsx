"use client";

import { HardDrive, Folder, Monitor, Lock } from "lucide-react";
import { type DriveNode, type FolderNode } from "@/lib/vfs";
import { TreeView } from "@/components/TreeView";
import { type MouseEvent, type ReactNode } from "react";

type FolderTreeNode = DriveNode | FolderNode;

interface FolderTreeViewProps {
  currentPath: string;
  items: FolderTreeNode[];
  loading?: boolean;
  error?: string | null;
  selectedPath?: string | null;
  onOpen: (item: FolderTreeNode) => void;
  onSelect?: (item: FolderTreeNode) => void;
  onContextMenu?: (e: MouseEvent<HTMLDivElement>, item: FolderTreeNode | null) => void;
  onRetry?: () => void;
}

export function FolderTreeView({
  currentPath,
  items,
  loading,
  error,
  selectedPath,
  onOpen,
  onSelect,
  onContextMenu,
  onRetry,
}: FolderTreeViewProps) {
  const getIcon = (item: FolderTreeNode): ReactNode => {
    if (item.type === "drive") {
      return <HardDrive className="w-5 h-5 text-blue-600" />;
    }
    if (item.type === "dir") {
      return <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
    }
    return <Monitor className="w-5 h-5 text-slate-600" />;
  };

  const getStatusIcon = (item: FolderTreeNode): ReactNode | null =>
    item.status === "prompt" ? <Lock className="w-3 h-3 text-amber-500 fill-amber-500" /> : null;

  const getChildren = (item: FolderTreeNode): FolderTreeNode[] | undefined => {
    // For now, assume no children; in a real implementation, you'd fetch subfolders
    return [];
  };

  return (
    <TreeView<FolderTreeNode>
      items={items}
      loading={loading}
      error={error}
      defaultExpanded={[currentPath]}
      selectedKey={selectedPath}
      getKey={(item) => item.path}
      getLabel={(item) => item.name}
      getIcon={getIcon}
      getChildren={getChildren}
      getStatusIcon={getStatusIcon}
      onSelect={onSelect}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
      onRetry={onRetry}
    />
  );
}
