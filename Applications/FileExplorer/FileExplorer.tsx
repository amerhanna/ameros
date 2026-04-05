"use client";

import { useState, useEffect, useCallback } from "react";
import { useSystemActions } from "@/hooks/useSystemActions";
import { useWindowActions } from "@/hooks/useWindowActions";
import { vfs, type VFSNode, type FolderTreeNode } from "@/lib/vfs";
import { type MenuItemType } from "@/components/WindowManager/Menu";
import ContextMenu from "@/components/WindowManager/ContextMenu";
import { toast } from "sonner";

// Internal Components
import { FolderView } from "@/components/FolderView";
import { FolderTreeView } from "@/components/FolderTreeView";
import { NameInputDialog } from "./components/NameInputDialog";
import { FileProperties } from "./components/FileProperties";
import { Toolbar } from "./components/Toolbar";
import { StatusBar } from "./components/StatusBar";
import { useClipboard } from "@/lib/clipboard";

export default function FileExplorer() {
  const { launchApp } = useSystemActions();
  const { openChildWindow } = useWindowActions();
  const [currentPath, setCurrentPath] = useState("/");
  const [items, setItems] = useState<VFSNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cut, copy, clear, clipboard } = useClipboard();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: VFSNode | null } | null>(null);

  const initVFS = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await vfs.init();
      const content = await vfs.ls(currentPath);
      setItems(content);
      const tree = await vfs.getTree();
      setTreeData(tree);
    } catch (err) {
      setError((err as Error).message);
      toast.error("VFS Error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    initVFS();
  }, [initVFS]);

  const handleOpen = async (node: VFSNode) => {
    if (node.status === "prompt") {
      const letter = node.path.split(":")[0];
      const granted = await vfs.requestPermission(letter);
      if (granted) {
        initVFS();
      }
      return;
    }

    if (node.type === "dir") {
      setCurrentPath(node.path);
      setSelectedPath(null);
    } else {
      if (node.name.toLowerCase().endsWith(".txt")) {
        try {
          const content = await vfs.readFile(node.path);
          const textContent =
            content instanceof Blob
              ? await content.text()
              : content instanceof ArrayBuffer
                ? new TextDecoder().decode(content)
                : typeof content === "string"
                  ? content
                  : "";

          launchApp("TextEditor", {
            title: `${node.name} - Text Editor`,
            launchArgs: {
              filePath: node.path,
              initialContent: textContent,
            },
          });
        } catch (err) {
          toast.error("Failed to read file");
        }
      } else {
        toast("File type not supported", { description: "Opening binary files is coming soon!" });
      }
    }
  };

  const handleBack = () => {
    if (currentPath === "/" || currentPath === "" || currentPath === "/") return;

    // If it's a drive root like "C:", go to "/"
    if (currentPath.match(/^[A-Z]:$/)) {
      setCurrentPath("/");
      setSelectedPath(null);
      return;
    }

    const lastSlash = currentPath.lastIndexOf("/");
    if (lastSlash === -1) {
      setCurrentPath("/");
      setSelectedPath(null);
    } else {
      const newPath = currentPath.substring(0, lastSlash);
      setCurrentPath(newPath || (currentPath.includes(":") ? currentPath.split(":")[0] + ":" : "/"));
      setSelectedPath(null);
    }
  };

  const handleMount = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });
      const letter = await vfs.mountFolder(handle);
      await vfs.requestPermission(letter);
      initVFS();
      toast.success("Folder mounted successfully");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Mount failed", err);
        toast.error("Failed to mount folder");
      }
    }
  };

  const treeItems = treeData;

  const handleTreeOpen = (item: VFSNode) => {
    if (item.type === "drive" || item.type === "dir") {
      setCurrentPath(item.path);
      setSelectedPath(null);
    }
  };

  const handleTreeSelect = (item: VFSNode) => {
    // Optional: highlight in tree
  };

  // --- Context Menu Actions ---

  const handleDelete = async (path: string) => {
    try {
      await vfs.delete(path);
      initVFS();
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleRename = async (path: string) => {
    let oldName = path.split("/").pop() || "";
    if (path.match(/^[A-Z]:$/)) {
      oldName = await vfs.getVolumeLabel(path[0]);
    }
    openChildWindow({
      title: "Rename",
      component: () => (
        <NameInputDialog
          initialValue={oldName}
          label={`Enter new name for '${oldName}':`}
          onConfirm={async (newName) => {
            try {
              await vfs.rename(path, newName);
              initVFS();
              toast.success("Renamed successful");
            } catch (err) {
              toast.error("Failed to rename");
            }
          }}
        />
      ),
      width: 300,
      height: 150,
      modal: true,
      resizable: false,
    });
  };

  const handleNewFolder = () => {
    if (currentPath === "/") return;
    openChildWindow({
      title: "New Folder",
      component: () => (
        <NameInputDialog
          initialValue="New Folder"
          label="Enter name for new folder:"
          onConfirm={async (name) => {
            try {
              await vfs.mkdir(`${currentPath}/${name}`);
              initVFS();
              toast.success("Folder created");
            } catch (err) {
              toast.error("Failed to create folder");
            }
          }}
        />
      ),
      width: 300,
      height: 150,
      modal: true,
      resizable: false,
    });
  };

  const handleNewFile = () => {
    if (currentPath === "/") return;
    openChildWindow({
      title: "New File",
      component: () => (
        <NameInputDialog
          initialValue="New Text Document.txt"
          label="Enter name for new file:"
          onConfirm={async (name) => {
            try {
              await vfs.touch(`${currentPath}/${name}`);
              initVFS();
              toast.success("File created");
            } catch (err) {
              toast.error("Failed to create file");
            }
          }}
        />
      ),
      width: 300,
      height: 150,
      modal: true,
      resizable: false,
    });
  };

  const handleCut = (path: string) => {
    cut(path, {
      onSuccess: () => toast.info("Item cut to clipboard"),
      onError: () => toast.error("Failed to cut item")
    });
  };

  const handleCopy = (path: string) => {
    copy(path, {
      onSuccess: () => toast.info("Item copied to clipboard"),
      onError: () => toast.error("Failed to copy item")
    });
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.itemType !== "file" || currentPath === "/") return;
    const name = clipboard.item.split("/").pop() || "unknown";
    const dest = `${currentPath}/${name}`;

    try {
      if (clipboard.action === "copy") {
        await vfs.copy(clipboard.item, dest);
      } else {
        await vfs.move(clipboard.item, dest);
        clear(); // Clear cut clipboard
      }
      initVFS();
      toast.success(`Pasted into ${currentPath}`);
    } catch (err) {
      toast.error("Failed to paste items");
    }
  };

  const handleProperties = (path: string) => {
    openChildWindow({
      title: "Properties",
      component: () => <FileProperties path={path} />,
      width: 320,
      height: 420,
      modal: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
    });
  };

  const handleContextMenu = (e: React.MouseEvent, item: VFSNode | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleSelect = (node: VFSNode) => {
    setSelectedPath(node.path);
  };

  const closeContextMenu = () => setContextMenu(null);

  // --- Render logic ---

  const driveMenuItems: MenuItemType[] = [
    { type: "item", label: "Open", action: () => handleOpen(contextMenu!.item!), icon: "📁" },
    { type: "separator" },
    { type: "item", label: "Rename", action: () => handleRename(contextMenu!.item!.path) },
    { type: "item", label: "Properties", action: () => handleProperties(contextMenu!.item!.path), icon: "ℹ️" },
  ];

  const fileMenuItems: MenuItemType[] = [
    { type: "item", label: "Open", action: () => handleOpen(contextMenu!.item!), bold: true },
    { type: "separator" },
    { type: "item", label: "Cut", action: () => handleCut(contextMenu!.item!.path), icon: "✂️" },
    { type: "item", label: "Copy", action: () => handleCopy(contextMenu!.item!.path), icon: "📋" },
    { type: "separator" },
    { type: "item", label: "Delete", action: () => handleDelete(contextMenu!.item!.path), icon: "🗑️" },
    { type: "item", label: "Rename", action: () => handleRename(contextMenu!.item!.path) },
    { type: "separator" },
    { type: "item", label: "Properties", action: () => handleProperties(contextMenu!.item!.path), icon: "ℹ️" },
  ];

  const isThisPC = currentPath === "/";

  const emptySpaceMenuItems: MenuItemType[] = [
    { type: "item", label: "Paste", action: handlePaste, disabled: !clipboard || isThisPC, icon: "📥" },
    { type: "separator" },
    { type: "item", label: "New Folder", action: handleNewFolder, disabled: isThisPC, icon: "📁" },
    { type: "item", label: "New File", action: handleNewFile, disabled: isThisPC, icon: "📄" },
    { type: "item", label: "Refresh", action: initVFS, icon: "🔄" },
  ];

  return (
    <div
      className="flex flex-col h-full bg-[#f0f0f0] text-slate-900 font-sans select-none border border-[#808080]"
      onClick={closeContextMenu}
    >
      <Toolbar currentPath={currentPath} canGoBack={currentPath !== "/"} onBack={handleBack} onMount={handleMount} />

      <div className="flex-1 overflow-hidden bg-white m-1 border border-[#808080] shadow-inner relative">
        <div className="h-full flex min-h-0 overflow-hidden">
          <div className="w-64 min-h-0 border-r border-slate-200">
            <FolderTreeView
              currentPath={currentPath}
              items={treeItems}
              loading={loading}
              error={error}
              selectedPath={currentPath}
              onOpen={handleTreeOpen}
              onSelect={handleTreeSelect}
              onContextMenu={() => {}}
              onRetry={initVFS}
            />
          </div>
          <div className="flex-1 min-h-0">
            <FolderView
              items={items}
              loading={loading}
              error={error}
              clipboard={clipboard}
              selectedPath={selectedPath}
              onOpen={handleOpen}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
              onRetry={initVFS}
            />
          </div>
        </div>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={
              !contextMenu.item
                ? emptySpaceMenuItems
                : contextMenu.item.path === "C:" || contextMenu.item.path.endsWith(":")
                  ? driveMenuItems
                  : fileMenuItems
            }
            onDismiss={closeContextMenu}
          />
        )}
      </div>

      <StatusBar itemCount={items.length} clipboard={clipboard} />
    </div>
  );
}
