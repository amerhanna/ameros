'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderView } from '@/components/FolderView';
import { FolderTreeView } from '@/components/FolderTreeView';
import { vfs, type VFSNode, type FolderTreeNode } from '@/lib/vfs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronUp, FolderPlus } from 'lucide-react';
import ResizablePanels from '@/components/layout/ResizablePanels';

interface SystemDialogFrameProps {
  confirmLabel: string;
  initialPath?: string;/*  */
  selectionMode: 'file' | 'save' | 'folder';/*  */
  onConfirm: (path: string) => void;
  onCancel: () => void;
  fileFilter?: (node: VFSNode) => boolean;
}

export function SystemDialogFrame({
  confirmLabel,
  initialPath = '/',
  selectionMode,
  onConfirm,
  onCancel,
  fileFilter,
}: SystemDialogFrameProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState<VFSNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  // Tree state
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([]);
  const [treeLoaded, setTreeLoaded] = useState(false);

  const loadFolder = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        if (!(await vfs.exists(path)) && path !== '/') {
          path = '/';
        }
        const content = await vfs.ls(path);
        let filtered = content;
        if ((selectionMode === 'file' || selectionMode === 'save') && fileFilter) {
          filtered = content.filter((item) => item.type === 'dir' || fileFilter(item));
        }
        setItems(filtered);
        setCurrentPath(path);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [selectionMode, fileFilter]
  );

  const loadFolderItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await vfs.ls(currentPath, { types: 'all' });
      setItems(content);
    } catch (err) {
      setError((err as Error).message);
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
        const tree = await vfs.ls('/', { types: 'dir', depth: 2 });
        setTreeData(tree);
        setTreeLoaded(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, 
  [treeLoaded]
);

  useEffect(() => {
    loadFolder(initialPath);
  }, [initialPath, loadFolder]);

  useEffect(() => {
    loadTreeItems();
  }, [loadTreeItems]);

  useEffect(() => {
    const handleVfsChange = (e: any) => {
      const { path } = e.detail;
      if (path === '/' || path === currentPath || currentPath.startsWith(path)) {
        loadFolderItems();
        loadTreeItems();
      }
    };

    window.addEventListener('vfs-change', handleVfsChange);
    return () => window.removeEventListener('vfs-change', handleVfsChange);
  }, [currentPath, loadFolderItems, loadTreeItems]);

  const handleSelect = (node: VFSNode) => {
    if (node.type === 'file' && (selectionMode === 'file' || selectionMode === 'save')) {
      setSelectedName(node.name);
    } else if (node.type === 'dir' && selectionMode === 'folder') {
      setSelectedName(node.name);
    }
  };

  const handleOpen = async (node: VFSNode) => {
    if (node.status === 'prompt') {
      const name = node.path.split('/').pop()!;
      const granted = await vfs.requestPermission(name);
      if (granted) {
        setCurrentPath(node.path);
        loadFolderItems();
        loadTreeItems();
        setHistory((prev) => [...prev, currentPath]);
        loadFolder(node.path);
        if (selectionMode === 'folder') {
          setSelectedName(node.name);
        } else {
          setSelectedName('');
        }
      }
      return;
    }

    if (node.type === 'dir' || node.isMountPoint) {
      setHistory((prev) => [...prev, currentPath]);
      loadFolder(node.path);
      if (selectionMode === 'folder') {
        setSelectedName(node.name);
      } else {
        setSelectedName('');
      }
    } else {
      if (selectionMode === 'file' || selectionMode === 'save') {
        const path = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
        onConfirm(path);
      }
    }
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      loadFolder(prev);
    }
  };

  const handleUp = () => {
    if (currentPath === '/' || currentPath === '') return;

    if (currentPath.split('/').filter(Boolean).length <= 1) {
      setHistory((prev) => [...prev, currentPath]);
      loadFolder('/');
      return;
    }

    const lastSlash = currentPath.lastIndexOf('/');
    const newPath = lastSlash <= 0 ? '/' : currentPath.substring(0, lastSlash);
    setHistory((prev) => [...prev, currentPath]);
    loadFolder(newPath);
    setSelectedName('');
  };

  const handleToggle = useCallback(async (item: VFSNode, expanded: boolean) => {
    if (expanded) {
      try {
        const children = await vfs.ls(item.path, { types: 'dir', depth: 2 });
        setTreeData((prev) => {
          const updateNodes = (nodes: VFSNode[]): VFSNode[] => {
            return nodes.map((node) => {
              if (node.path === item.path) {
                return { ...node, children };
              }
              if (node.children) {
                return { ...node, children: updateNodes(node.children) };
              }
              return node;
            });
          };
          return updateNodes(prev);
        });
      } catch (err) {
        // Silent fail for dialogs or handle gracefully
      }
    }
  }, []);

  const handleConfirm = () => {
    if (selectionMode === 'folder') {
      onConfirm(currentPath);
    } else {
      if (selectedName) {
        const path = currentPath === '/' ? `/${selectedName}` : `${currentPath}/${selectedName}`;
        onConfirm(path);
      }
    }
  };

  const handleNewFolder = async () => {
    if (currentPath === '/') return;
    const name = prompt('Enter folder name:', 'New Folder');
    if (name) {
      try {
        await vfs.mkdir(`${currentPath}/${name}`);
        loadFolder(currentPath);
        loadTreeItems(); // Refresh tree
      } catch (err) {
        alert('Failed to create folder');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] text-sm p-3 gap-3 select-none border-t-white border-l-white border-b-[#808080] border-r-[#808080] border shadow-[inset_1px_1px_0px_white] text-black">
      {/* Top Bar */}
      <div className="flex items-center gap-2">
        <span className="shrink-0">Look in:</span>
        <div className="flex-1 bg-white border border-[#808080] h-6 flex items-center px-2 text-xs shadow-[inset_1px_1px_1px_rgba(0,0,0,0.2)]">
          {currentPath}
        </div>
        <div className="flex gap-1">
          <button
            disabled={history.length === 0}
            onClick={handleBack}
            className="w-6 h-6 flex items-center justify-center border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] hover:bg-gray-100 active:shadow-inner disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleUp}
            className="w-6 h-6 flex items-center justify-center border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] hover:bg-gray-100 active:shadow-inner"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={handleNewFolder}
            className="w-6 h-6 flex items-center justify-center border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] hover:bg-gray-100 active:shadow-inner"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 min-h-0 bg-white border border-[#808080] overflow-hidden shadow-[inset_1px_1px_1px_rgba(0,0,0,0.2)]">
        <ResizablePanels direction="horizontal" initialSizes={[30, 70]} minSize={100} className="h-full">
          {/* Tree View */}
          <div className="h-full border-r border-[#808080] bg-white overflow-y-auto">
            <FolderTreeView
              currentPath={'/'}
              items={treeData}
              loading={!treeLoaded}
              error={error}
              selectedPath={currentPath}
              onOpen={handleOpen}
              onSelect={handleOpen}
              onToggle={handleToggle}
              onContextMenu={() => {}}
              onRetry={() => loadTreeItems()}
            />
          </div>

          {/* Folder View */}
          <div className="h-full min-h-0">
            <FolderView
              items={items}
              loading={loading}
              error={error}
              selectedPath={selectedName ? (currentPath === '/' ? `/${selectedName}` : `${currentPath}/${selectedName}`) : null}
              onOpen={handleOpen}
              onSelect={handleSelect}
              onContextMenu={() => {}}
              viewStyle="grid"
            />
          </div>
        </ResizablePanels>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-right">{selectionMode === 'folder' ? 'Folder name:' : 'File name:'}</span>
          <input
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            className="flex-1 h-6 border border-[#808080] bg-white text-xs px-2 focus:outline-none shadow-[inset_1px_1px_1px_rgba(0,0,0,0.2)]"
          />
          <button
            onClick={handleConfirm}
            className="w-20 h-6 border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] text-xs hover:bg-gray-200 active:shadow-inner font-medium"
          >
            {confirmLabel}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-right">Files of type:</span>
          <div className="flex-1 bg-white border border-[#808080] h-6 flex items-center px-2 text-xs text-slate-500 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.2)]">
            All Files (*.*)
          </div>
          <button
            onClick={onCancel}
            className="w-20 h-6 border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] text-xs hover:bg-gray-200 active:shadow-inner"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
