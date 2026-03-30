"use client"
import { SystemDialogFrame } from "./SystemDialogFrame"
import { type VFSNode } from "@/lib/vfs"

export interface SaveFileDialogProps {
  onResolve: (path: string | null) => void
  initialPath?: string
  fileFilter?: (node: VFSNode) => boolean
}

export function SaveFileDialog({ onResolve, initialPath, fileFilter }: SaveFileDialogProps) {
  return (
    <SystemDialogFrame
      confirmLabel="Save"
      selectionMode="save"
      initialPath={initialPath}
      onConfirm={onResolve}
      onCancel={() => onResolve(null)}
      fileFilter={fileFilter}
    />
  )
}
