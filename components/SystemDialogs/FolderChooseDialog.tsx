"use client"
import { SystemDialogFrame } from "./SystemDialogFrame"

export interface FolderChooseDialogProps {
  onResolve: (path: string | null) => void
  initialPath?: string
}

export function FolderChooseDialog({ onResolve, initialPath }: FolderChooseDialogProps) {
  return (
    <SystemDialogFrame
      confirmLabel="OK"
      selectionMode="folder"
      initialPath={initialPath}
      onConfirm={onResolve}
      onCancel={() => onResolve(null)}
    />
  )
}
