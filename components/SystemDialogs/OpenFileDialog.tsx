"use client"
import { SystemDialogFrame } from "./SystemDialogFrame"
import { type VFSNode } from "@/lib/vfs"

export interface OpenFileDialogProps {
  onResolve: (path: string | null) => void
  initialPath?: string
  fileFilter?: (node: VFSNode) => boolean
}

export function OpenFileDialog({ onResolve, initialPath, fileFilter }: OpenFileDialogProps) {
  return (
    <SystemDialogFrame
      confirmLabel="Open"
      selectionMode="file"
      initialPath={initialPath}
      onConfirm={onResolve}
      onCancel={() => onResolve(null)}
      fileFilter={fileFilter}
    />
  )
}
