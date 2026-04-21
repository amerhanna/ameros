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

// Hoist these pure functions outside the component.
// This gives them stable references, preventing the underlying TreeView
// from unnecessarily remounting nodes and wiping out local expansion state.
const getIcon = (item: FolderTreeNode): ReactNode => {
  if (item.type === "dir" || item.type === "drive") {
    return item.isMountPoint ? (
      <HardDrive className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <Folder className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
    );
  }
  return <Monitor className="w-5 h-5 text-slate-600" />;
};

const getStatusIcon = (item: FolderTreeNode): ReactNode | null =>
  item.status === "prompt" ? <Lock className="w-3 h-3 text-amber-500 fill-amber-500" /> : null;

const getChildren = (item: FolderTreeNode): FolderTreeNode[] | undefined => {
  return item.children;
};

const getKey = (item: FolderTreeNode): string => {
  return item.path;
};

const getLabel = (item: FolderTreeNode): string => {
  return item.name;
};

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
  return (
    <TreeView<FolderTreeNode>
      items={items}
      loading={loading}
      error={error}
      defaultExpanded={[currentPath]}
      selectedKey={selectedPath}
      getKey={getKey}
      getLabel={getLabel}
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
