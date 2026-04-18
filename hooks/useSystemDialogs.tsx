"use client"

import { useCallback, useMemo } from "react"
import { useWindowActions } from "@/hooks/useWindowActions"
import { OpenFileDialog } from "@/components/SystemDialogs/OpenFileDialog"
import { SaveFileDialog } from "@/components/SystemDialogs/SaveFileDialog"
import { FolderChooseDialog } from "@/components/SystemDialogs/FolderChooseDialog"
import { type VFSNode } from "@/lib/vfs"

/**
 * Provides access to standard OS-level dialog windows (File Pickers, Folder Resolvers).
 * These dialogs automatically spawn as modal child windows anchored to the active app.
 * 
 * @returns Object containing async dialog spawn methods:
 * - `showOpenFileDialog`: Prompts user to select an existing file. Returns the absolute path or null.
 * - `showSaveFileDialog`: Prompts user to choose a target destination path for saving. Returns path or null.
 * - `showFolderChooseDialog`: Prompts user to select a directory path. Returns path or null.
 */
export function useSystemDialogs() {
  const { openChildWindow, getBounds } = useWindowActions()

  const showOpenFileDialog = useCallback(async (options: { initialPath?: string, fileFilter?: (node: VFSNode) => boolean } = {}) => {
    const boxW = 500
    const boxH = 420
    const { x: bx, y: by, width: bw, height: bh } = getBounds()
    const px = Math.round(bx + Math.max(0, (bw - boxW) / 2))
    const py = Math.round(by + Math.max(0, (bh - boxH) / 2))

    return new Promise<string | null>((resolve) => {
      const Content = () => {
        const { close } = useWindowActions()
        const handleResolve = (path: string | null) => {
          resolve(path)
          close()
        }
        return <OpenFileDialog onResolve={handleResolve} initialPath={options.initialPath} fileFilter={options.fileFilter} />
      }

      const id = openChildWindow({
        title: "Open",
        component: Content,
        width: boxW,
        height: boxH,
        x: px,
        y: py,
        modal: true,
        resizable: true,
        maximizable: true,
        minimizable: false,
      })

      if (!id) resolve(null)
    })
  }, [openChildWindow, getBounds])

  const showSaveFileDialog = useCallback(async (options: { initialPath?: string, fileFilter?: (node: VFSNode) => boolean } = {}) => {
    const boxW = 500
    const boxH = 420
    const { x: bx, y: by, width: bw, height: bh } = getBounds()
    const px = Math.round(bx + Math.max(0, (bw - boxW) / 2))
    const py = Math.round(by + Math.max(0, (bh - boxH) / 2))

    return new Promise<string | null>((resolve) => {
      const Content = () => {
        const { close } = useWindowActions()
        const handleResolve = (path: string | null) => {
          resolve(path)
          close()
        }
        return <SaveFileDialog onResolve={handleResolve} initialPath={options.initialPath} fileFilter={options.fileFilter} />
      }

      const id = openChildWindow({
        title: "Save As",
        component: Content,
        width: boxW,
        height: boxH,
        x: px,
        y: py,
        modal: true,
        resizable: true,
        maximizable: true,
        minimizable: false,
      })

      if (!id) resolve(null)
    })
  }, [openChildWindow, getBounds])

  const showFolderChooseDialog = useCallback(async (options: { initialPath?: string } = {}) => {
    const boxW = 450
    const boxH = 400
    const { x: bx, y: by, width: bw, height: bh } = getBounds()
    const px = Math.round(bx + Math.max(0, (bw - boxW) / 2))
    const py = Math.round(by + Math.max(0, (bh - boxH) / 2))

    return new Promise<string | null>((resolve) => {
      const Content = () => {
        const { close } = useWindowActions()
        const handleResolve = (path: string | null) => {
          resolve(path)
          close()
        }
        return <FolderChooseDialog onResolve={handleResolve} initialPath={options.initialPath} />
      }

      const id = openChildWindow({
        title: "Browse For Folder",
        component: Content,
        width: boxW,
        height: boxH,
        x: px,
        y: py,
        modal: true,
        resizable: true,
        maximizable: false,
        minimizable: false,
      })

      if (!id) resolve(null)
    })
  }, [openChildWindow, getBounds])

  return useMemo(() => ({
    showOpenFileDialog,
    showSaveFileDialog,
    showFolderChooseDialog,
  }), [showOpenFileDialog, showSaveFileDialog, showFolderChooseDialog])
}
