'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemActions } from '@/hooks/useSystemActions';
import { useWindowActions } from '@/hooks/useWindowActions';
import { vfs, type VFSNode, type FolderTreeNode } from '@/lib/vfs';
import { type MenuItemType } from '@/components/WindowManager/Menu';
import ContextMenu from '@/components/WindowManager/ContextMenu';
import { toast } from 'sonner';

// Internal Components
import { FolderView } from '@/components/FolderView';
import { FolderTreeView } from '@/components/FolderTreeView';
import { NameInputDialog } from './components/NameInputDialog';
import { FileProperties } from './components/FileProperties';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import ResizablePanels from '@/components/layout/ResizablePanels';
import { useClipboard } from '@/lib/clipboard';

export default function FileExplorer() {
  const { launchApp } = useSystemActions();
  const { openChildWindow } = useWindowActions();
  const [history, setHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentPath = history[historyIndex] || '/';
  const [items, setItems] = useState<VFSNode[]>([]);

  const navigateTo = useCallback((path: string) => {
    if (path === currentPath) return;
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(path);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    setSelectedPath(null);
  }, [currentPath, historyIndex]);
  const [loading, setLoading] = useState(true);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cut, copy, clear, clipboard } = useClipboard();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: VFSNode | null } | null>(null);

  const loadFolderItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await vfs.ls(currentPath);
      setItems(content);
    } catch (err) {
      setError((err as Error).message);
      toast.error('VFS Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadFolderItems();
  }, [loadFolderItems]);

  const loadTreeItems = useCallback(
    async () => {
      try {
          const tree = await vfs.getTree();
          setTreeData(tree);
          setTreeLoaded(true);
      } catch (err) {
        setError((err as Error).message);
        toast.error('VFS Error: ' + (err as Error).message);
      }
    },
    []
  );

  useEffect(() => {
    loadTreeItems();
  }, [loadTreeItems]);

  const handleOpen = async (node: VFSNode) => {
    if (node.status === 'prompt') {
      const letter = node.path.split(':')[0];
      const granted = await vfs.requestPermission(letter);
      if (granted) {
        navigateTo(node.path);
        loadFolderItems();
        loadTreeItems();
      }
      return;
    }

    if (node.type === 'dir' || node.isMountPoint) {
      navigateTo(node.path);
    } else {
      if (node.name.toLowerCase().endsWith('.txt')) {
        try {
          const content = await vfs.readFile(node.path);
          const textContent =
            content instanceof Blob
              ? await content.text()
              : content instanceof ArrayBuffer
              ? new TextDecoder().decode(content)
              : typeof content === 'string'
              ? content
              : '';

          launchApp('TextEditor', {
            title: `${node.name} - Text Editor`,
            launchArgs: {
              filePath: node.path,
              initialContent: textContent,
            },
          });
        } catch (err) {
          toast.error('Failed to read file');
        }
      } else {
        toast('File type not supported', { description: 'Opening binary files is coming soon!' });
      }
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setSelectedPath(null);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setSelectedPath(null);
    }
  };

  const handleUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      navigateTo('/');
    } else {
      navigateTo('/' + parts.slice(0, -1).join('/'));
    }
  };

  const handleMount = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      const letter = await vfs.mountFolder(handle);
      await vfs.requestPermission(letter);
      loadFolderItems();
      loadTreeItems();
      toast.success('Folder mounted successfully');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Mount failed', err);
        toast.error('Failed to mount folder');
      }
    }
  };

  const handleUnmount = async () => {
    if (selectedPath && vfs.isMountPoint(selectedPath)) {
      const name = selectedPath.split('/').pop()!;
      try {
        await vfs.unmountFolder(name);
        navigateTo('/');
        loadFolderItems();
        loadTreeItems();
        toast.success(`Mount '${name}' unmounted`);
      } catch (err) {
        toast.error('Failed to unmount folder');
      }
    }
  };

  const handlePathChange = (path: string) => {
    navigateTo(path);
  };

  // --- Context Menu Actions ---

  const handleDelete = async (path: string) => {
    try {
      await vfs.delete(path);
      loadFolderItems();
      toast.success('Deleted successfully');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleRename = async (path: string) => {
    let oldName = path.split('/').pop() || '';
    openChildWindow({
      title: 'Rename',
      component: () => (
        <NameInputDialog
          initialValue={oldName}
          label={`Enter new name for '${oldName}':`}
          onConfirm={async (newName) => {
            try {
              await vfs.rename(path, newName);
              loadFolderItems();
              toast.success('Renamed successful');
            } catch (err) {
              toast.error('Failed to rename');
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
    if (currentPath === '/') return;
    openChildWindow({
      title: 'New Folder',
      component: () => (
        <NameInputDialog
          initialValue="New Folder"
          label="Enter name for new folder:"
          onConfirm={async (name) => {
            try {
              await vfs.mkdir(`${currentPath}/${name}`);
              loadFolderItems();
              loadTreeItems();
              toast.success('Folder created');
            } catch (err) {
              toast.error('Failed to create folder');
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
    if (currentPath === '/') return;
    openChildWindow({
      title: 'New File',
      component: () => (
        <NameInputDialog
          initialValue="New Text Document.txt"
          label="Enter name for new file:"
          onConfirm={async (name) => {
            try {
              await vfs.touch(`${currentPath}/${name}`);
              loadFolderItems();
              toast.success('File created');
            } catch (err) {
              toast.error('Failed to create file');
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
      onSuccess: () => toast.info('Item cut to clipboard'),
      onError: () => toast.error('Failed to cut item'),
    });
  };

  const handleCopy = (path: string) => {
    copy(path, {
      onSuccess: () => toast.info('Item copied to clipboard'),
      onError: () => toast.error('Failed to copy item'),
    });
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.itemType !== 'file' || currentPath === '/') return;
    const name = clipboard.item.split('/').pop() || 'unknown';
    const dest = `${currentPath}/${name}`;

    try {
      if (clipboard.action === 'copy') {
        await vfs.copy(clipboard.item, dest);
      } else {
        await vfs.move(clipboard.item, dest);
        clear();
      }
      loadFolderItems();
      toast.success(`Pasted into ${currentPath}`);
    } catch (err) {
      toast.error('Failed to paste items');
    }
  };

  const handleProperties = (path: string) => {
    openChildWindow({
      title: 'Properties',
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
    { type: 'item', label: 'Open', action: () => handleOpen(contextMenu!.item!), icon: '📁' },
    { type: 'separator' },
    { type: 'item', label: 'Rename', action: () => handleRename(contextMenu!.item!.path) },
    { type: 'item', label: 'Properties', action: () => handleProperties(contextMenu!.item!.path), icon: 'ℹ️' },
  ];

  const fileMenuItems: MenuItemType[] = [
    { type: 'item', label: 'Open', action: () => handleOpen(contextMenu!.item!), bold: true },
    { type: 'separator' },
    { type: 'item', label: 'Cut', action: () => handleCut(contextMenu!.item!.path), icon: '✂️' },
    { type: 'item', label: 'Copy', action: () => handleCopy(contextMenu!.item!.path), icon: '📋' },
    { type: 'separator' },
    { type: 'item', label: 'Delete', action: () => handleDelete(contextMenu!.item!.path), icon: '🗑️' },
    { type: 'item', label: 'Rename', action: () => handleRename(contextMenu!.item!.path) },
    { type: 'separator' },
    { type: 'item', label: 'Properties', action: () => handleProperties(contextMenu!.item!.path), icon: 'ℹ️' },
  ];

  const isThisPC = currentPath === '/';

  const emptySpaceMenuItems: MenuItemType[] = [
    { type: 'item', label: 'Paste', action: handlePaste, disabled: !clipboard || isThisPC, icon: '📥' },
    { type: 'separator' },
    {
      type: 'submenu',
      label: 'New',
      icon: '✚',
      items: [
        { type: 'item', label: 'Folder', action: handleNewFolder, disabled: isThisPC, icon: '📁' },
        { type: 'item', label: 'File', action: handleNewFile, disabled: isThisPC, icon: '📄' },
      ],
    },
    { type: 'separator' },
    { type: 'item', label: 'Refresh', action: loadFolderItems, icon: '🔄' },
  ];

  return (
    <div
      className="flex flex-col h-full bg-[#f0f0f0] text-slate-900 font-sans select-none border border-[#808080]"
      onClick={closeContextMenu}
    >
      <Toolbar 
        currentPath={currentPath} 
        canGoBack={historyIndex > 0} 
        onBack={handleBack} 
        canGoForward={historyIndex < history.length - 1}
        onForward={handleForward}
        canGoUp={currentPath !== '/'}
        onUp={handleUp}
        canMount={currentPath === '/'}
        onMount={handleMount} 
        canUnmount={selectedPath !== null && vfs.isMountPoint(selectedPath)}
        onUnmount={handleUnmount}
        onPathChange={handlePathChange}
      />

      <div className="flex-1 overflow-hidden bg-white m-1 border border-[#808080] shadow-inner relative">
        <ResizablePanels direction="horizontal" initialSizes={[25, 75]} minSize={100} className="h-full">
          {/* Sidebar */}
          <div className="h-full border-r border-slate-200">
            <FolderTreeView
              currentPath={currentPath}
              items={treeData}
              loading={!treeLoaded}
              error={error}
              selectedPath={currentPath}
              onOpen={handleOpen}
              onSelect={handleOpen}
              onContextMenu={() => {}}
              onRetry={() => loadTreeItems()}
            />
          </div>

          {/* Main Content */}
          <div className="h-full">
            <FolderView
              items={items}
              loading={loading}
              error={error}
              viewStyle='details'
              clipboard={clipboard}
              selectedPath={selectedPath}
              onOpen={handleOpen}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
              onRetry={loadFolderItems}
            />
          </div>
        </ResizablePanels>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={
              !contextMenu.item
                ? emptySpaceMenuItems
                : contextMenu.item.isMountPoint
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
