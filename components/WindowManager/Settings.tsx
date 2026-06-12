"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { registry } from "@/lib/registry"
import { vfs } from "@/lib/vfs"
import { toast } from "sonner"
import { 
  Download, Upload, RotateCcw, Trash2, AlertTriangle,
  Folder, Plus, Eye, EyeOff, ChevronUp, ChevronDown, 
  ArrowUp, ArrowDown, FolderPlus, HelpCircle, Save, 
  CornerDownRight, PlusCircle
} from "lucide-react"
import { useSystemDialogs } from "@/hooks/useSystemDialogs"

const REGISTRY_DIR = "/System/config";
const START_MENU_PATH = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu';

interface StartMenuTreeItem {
  id: string;
  path: string;
  label: string;
  type: "item" | "submenu" | "action" | "separator";
  icon?: string;
  hidden?: boolean;
  component?: string;
  launchArgs?: any;
  actionId?: string;
  items?: StartMenuTreeItem[];
}


/** Triggers a browser file download from a Blob. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Prompt the user to select a file and return it. */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

type ConfirmState = {
  message: string;
  action: () => Promise<void>;
} | null;

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state) return null;

  const handleConfirm = async () => {
    onClose();
    await state.action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100 text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
            <p className="text-sm text-gray-500 mt-1">{state.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  variant = "outline",
  loading,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "outline" | "destructive";
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      className="gap-2 text-sm"
      onClick={onClick}
      disabled={loading}
    >
      <Icon className="w-4 h-4" />
      {loading ? "Working..." : label}
    </Button>
  );
}

const fetchTreeRecursive = async (path: string): Promise<StartMenuTreeItem[]> => {
  const order = await registry.get<string[]>(path, []);
  const menu: StartMenuTreeItem[] = [];

  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    if (id === 'separator') {
      menu.push({
        id: `separator-${i}-${Math.random().toString(36).substr(2, 9)}`,
        path: `${path}/separator-${i}`,
        label: '--------------------',
        type: 'separator'
      });
      continue;
    }

    const itemPath = `${path}/${id}`;
    const values = await registry.getValues(itemPath);
    const type = (values.type as "submenu" | "action" | undefined) || "item";

    if (type === 'submenu') {
      menu.push({
        id,
        path: itemPath,
        type: 'submenu',
        label: (values.label as string) || id,
        icon: values.icon as string,
        hidden: values.hidden === true || values.hidden === "true",
        items: await fetchTreeRecursive(itemPath)
      });
    } else if (type === 'action') {
      menu.push({
        id,
        path: itemPath,
        type: 'action',
        label: (values.label as string) || id,
        icon: values.icon as string,
        hidden: values.hidden === true || values.hidden === "true",
        actionId: values.actionId as string
      });
    } else {
      menu.push({
        id,
        path: itemPath,
        type: 'item',
        label: (values.label as string) || id,
        icon: values.icon as string,
        hidden: values.hidden === true || values.hidden === "true",
        component: (values.component as string) || "WebApp",
        launchArgs: values.launchArgs
      });
    }
  }
  return menu;
};

const getSubmenusRecursive = async (path: string, currentLabel: string): Promise<{ label: string; path: string }[]> => {
  const result: { label: string; path: string }[] = [];
  if (path === START_MENU_PATH) {
    result.push({ label: 'Root (Start Menu)', path: START_MENU_PATH });
  }
  const order = await registry.get<string[]>(path, []);
  for (const id of order) {
    if (id === 'separator') continue;
    const itemPath = `${path}/${id}`;
    const values = await registry.getValues(itemPath);
    if (values.type === 'submenu') {
      const label = `${currentLabel} > ${(values.label as string) || id}`;
      result.push({ label, path: itemPath });
      result.push(...await getSubmenusRecursive(itemPath, label));
    }
  }
  return result;
};

export default function Settings() {
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const { showOpenFileDialog } = useSystemDialogs();

  // --- Start Menu States ---
  const [startMenuTree, setStartMenuTree] = useState<StartMenuTreeItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StartMenuTreeItem | null>(null);
  const [submenuList, setSubmenuList] = useState<{ label: string; path: string }[]>([]);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editComponent, setEditComponent] = useState("");
  const [editLaunchArgs, setEditLaunchArgs] = useState("");
  const [editActionId, setEditActionId] = useState("");
  const [moveTargetPath, setMoveTargetPath] = useState("");

  const loadStartMenuData = useCallback(async () => {
    try {
      const tree = await fetchTreeRecursive(START_MENU_PATH);
      setStartMenuTree(tree);
      const subs = await getSubmenusRecursive(START_MENU_PATH, "Start Menu");
      setSubmenuList(subs);
    } catch (err) {
      console.error("Failed to load start menu tree", err);
    }
  }, []);

  useEffect(() => {
    loadStartMenuData();
  }, [loadStartMenuData]);

  // Update selection detail forms when selected item changes
  useEffect(() => {
    if (selectedItem && selectedItem.type !== 'separator') {
      setEditLabel(selectedItem.label || "");
      setEditIcon(selectedItem.icon || "");
      setEditComponent(selectedItem.component || "");
      setEditLaunchArgs(selectedItem.launchArgs ? JSON.stringify(selectedItem.launchArgs, null, 2) : "");
      setEditActionId(selectedItem.actionId || "");
      
      const parentPath = selectedItem.path.substring(0, selectedItem.path.lastIndexOf('/'));
      setMoveTargetPath(parentPath);
    }
  }, [selectedItem]);

  // --- Start Menu Action Handlers ---
  const handleReorder = async (item: StartMenuTreeItem, direction: "up" | "down") => {
    const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
    const order = await registry.get<string[]>(parentPath, []);
    
    let index = -1;
    if (item.type === 'separator') {
      const parts = item.id.split('-');
      index = parseInt(parts[1]);
    } else {
      index = order.indexOf(item.id);
    }

    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;

    const newOrder = [...order];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    await registry.set(parentPath, newOrder);
    toast.success("Item reordered");
    await loadStartMenuData();
  };

  const handleToggleVisibility = async (item: StartMenuTreeItem) => {
    if (item.type === 'separator') return;
    const newHidden = !item.hidden;
    await registry.set(`${item.path}/hidden`, newHidden);
    toast.success(newHidden ? "Item hidden" : "Item visible");
    await loadStartMenuData();
  };

  const moveRegistryKeyRecursive = async (src: string, dest: string) => {
    const values = await registry.getValues(src);
    for (const [key, val] of Object.entries(values)) {
      await registry.set(`${dest}/${key}`, val);
    }
    const subKeys = await registry.getKeys(src);
    for (const subKey of subKeys) {
      await moveRegistryKeyRecursive(`${src}/${subKey}`, `${dest}/${subKey}`);
    }
    await registry.deleteKey(src);
  };

  const handleMoveItemFolder = async (item: StartMenuTreeItem, targetParentPath: string) => {
    const sourceParentPath = item.path.substring(0, item.path.lastIndexOf('/'));
    if (sourceParentPath === targetParentPath) {
      toast.error("Item is already in that folder");
      return;
    }

    const sourceOrder = await registry.get<string[]>(sourceParentPath, []);
    const targetOrder = await registry.get<string[]>(targetParentPath, []);

    let itemIndex = -1;
    if (item.type === 'separator') {
      const parts = item.id.split('-');
      itemIndex = parseInt(parts[1]);
    } else {
      itemIndex = sourceOrder.indexOf(item.id);
    }

    if (itemIndex === -1) {
      toast.error("Item not found in parent order");
      return;
    }

    const newSourceOrder = [...sourceOrder];
    newSourceOrder.splice(itemIndex, 1);

    const newTargetOrder = [...targetOrder];
    const itemId = item.type === 'separator' ? 'separator' : item.id;
    newTargetOrder.push(itemId);

    await registry.set(sourceParentPath, newSourceOrder);
    await registry.set(targetParentPath, newTargetOrder);

    if (item.type !== 'separator') {
      const targetPath = `${targetParentPath}/${item.id}`;
      await moveRegistryKeyRecursive(item.path, targetPath);
    }

    toast.success(`Moved to ${targetParentPath === START_MENU_PATH ? 'Root' : targetParentPath.split('/').pop()}`);
    setSelectedItem(null);
    await loadStartMenuData();
  };

  const handleDeleteItem = async (item: StartMenuTreeItem) => {
    const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
    const order = await registry.get<string[]>(parentPath, []);

    let itemIndex = -1;
    if (item.type === 'separator') {
      const parts = item.id.split('-');
      itemIndex = parseInt(parts[1]);
    } else {
      itemIndex = order.indexOf(item.id);
    }

    if (itemIndex === -1) return;

    const newOrder = [...order];
    newOrder.splice(itemIndex, 1);
    await registry.set(parentPath, newOrder);

    if (item.type !== 'separator') {
      await registry.deleteKey(item.path);
    }

    toast.success("Item deleted");
    setSelectedItem(null);
    await loadStartMenuData();
  };

  const handleAddNewItem = async (type: 'item' | 'submenu' | 'separator') => {
    let parentPath = START_MENU_PATH;
    if (selectedItem && selectedItem.type === 'submenu') {
      parentPath = selectedItem.path;
    }

    const order = await registry.get<string[]>(parentPath, []);
    const newOrder = [...order];

    if (type === 'separator') {
      newOrder.push('separator');
      await registry.set(parentPath, newOrder);
      toast.success("Separator added");
      await loadStartMenuData();
      return;
    }

    const label = prompt(`Enter label for new ${type === 'submenu' ? 'submenu' : 'app'}:`);
    if (!label) return;

    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!id) return;

    const itemPath = `${parentPath}/${id}`;
    if (await registry.hasKey(itemPath)) {
      toast.error("An item with this key ID already exists here");
      return;
    }

    if (type === 'submenu') {
      await registry.set(`${itemPath}/type`, 'submenu');
      await registry.set(`${itemPath}/label`, label);
      await registry.set(`${itemPath}/icon`, '📂');
      await registry.set(`${itemPath}/default`, [] as string[]);
    } else {
      await registry.set(`${itemPath}/type`, 'item');
      await registry.set(`${itemPath}/label`, label);
      await registry.set(`${itemPath}/component`, 'WebApp');
      await registry.set(`${itemPath}/icon`, '🌐');
    }

    newOrder.push(id);
    await registry.set(parentPath, newOrder);
    toast.success(`${type === 'submenu' ? 'Submenu' : 'App'} added`);
    await loadStartMenuData();
  };

  const handleSaveDetails = async () => {
    if (!selectedItem || selectedItem.type === 'separator') return;

    await registry.set(`${selectedItem.path}/label`, editLabel);
    await registry.set(`${selectedItem.path}/icon`, editIcon);

    if (selectedItem.type === 'item') {
      await registry.set(`${selectedItem.path}/component`, editComponent);
      try {
        const parsed = editLaunchArgs ? JSON.parse(editLaunchArgs) : {};
        await registry.set(`${selectedItem.path}/launchArgs`, parsed);
      } catch {
        toast.error("Invalid JSON in Launch Args. Saved other settings.");
        return;
      }
    } else if (selectedItem.type === 'action') {
      await registry.set(`${selectedItem.path}/actionId`, editActionId);
    }

    toast.success("Properties saved");
    await loadStartMenuData();
  };

  const withLoading = useCallback(async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try {
      await fn();
    } catch (err: any) {
      toast.error(err?.message || "Operation failed.");
      console.error(err);
    } finally {
      setLoading(null);
    }
  }, []);

  // --- Appearance actions ---
  const handleSelectWallpaper = async () => {
    const path = await showOpenFileDialog({
      initialPath: "/System/Wallpaper",
      fileFilter: (node) => node.type === "file" && /\.(png|jpe?g|gif|svg|webp)$/i.test(node.name)
    });
    if (path) {
      await registry.set("HKEY_CURRENT_USER/Control Panel/Desktop/Wallpaper", path);
      toast.success("Wallpaper updated");
    }
  };

  // --- Registry actions ---
  const handleExportRegistry = () =>
    withLoading("exportReg", async () => {
      const blob = await registry.exportHive();
      downloadBlob(blob, "ameros_registry.json");
      toast.success("Registry exported successfully.");
    });

  const handleImportRegistry = () =>
    withLoading("importReg", async () => {
      const file = await pickFile(".json");
      if (!file) return;
      await registry.importHive(file);
      toast.success("Registry imported successfully. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    });

  const handleResetRegistry = () =>
    setConfirm({
      message: "This will wipe all registry settings and restore them to factory defaults. The system will reload.",
      action: async () => {
        await registry.factoryReset();
      },
    });

  // --- Storage actions ---
  const handleExportStorage = () =>
    withLoading("exportStorage", async () => {
      const blob = await vfs.exportStorage([REGISTRY_DIR]);
      downloadBlob(blob, "ameros_storage.zip");
      toast.success("Internal storage exported successfully.");
    });

  const handleImportStorage = () =>
    withLoading("importStorage", async () => {
      const file = await pickFile(".zip");
      if (!file) return;
      await vfs.importStorage(file);
      toast.success("Internal storage imported successfully. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    });

  const handleResetStorage = () =>
    setConfirm({
      message: "This will delete all files on the internal storage (root filesystem), excluding the registry. The system will reload.",
      action: async () => {
        await vfs.clearStorage([REGISTRY_DIR]);
        toast.success("Internal storage cleared. Reloading...");
        setTimeout(() => window.location.reload(), 1000);
      },
    });

  // --- Reset everything ---
  const handleResetEverything = () =>
    setConfirm({
      message: "This will permanently erase ALL data — registry settings, files, and storage. The system will be completely reset to factory state.",
      action: async () => {
        await vfs.factoryReset();
      },
    });

  const renderTreeNodes = (nodes: StartMenuTreeItem[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isSelected = selectedItem?.id === node.id && selectedItem?.path === node.path;
      return (
        <div key={node.id} className="flex flex-col">
          <div 
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-150 group my-0.5 ${
              isSelected 
                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                : "hover:bg-gray-100 border border-transparent"
            }`}
            style={{ paddingLeft: `${Math.max(8, depth * 20)}px` }}
            onClick={() => setSelectedItem(node)}
          >
            <div className="flex items-center gap-2 overflow-hidden select-none">
              {node.type === 'submenu' && <Folder className="w-4 h-4 text-yellow-500 shrink-0" />}
              {node.type === 'separator' && <div className="h-[2px] bg-gray-300 w-16 my-1 shrink-0" />}
              {node.type !== 'submenu' && node.type !== 'separator' && (
                <span className="w-4 h-4 text-center text-xs leading-4 shrink-0 bg-gray-200 rounded">
                  {node.icon && node.icon.startsWith('http') ? '🌐' : (node.icon || '📄')}
                </span>
              )}
              <span className={`text-sm truncate font-medium ${node.hidden ? "text-gray-400 line-through" : "text-gray-700"}`}>
                {node.type === 'separator' ? 'Separator' : node.label}
              </span>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); handleReorder(node, 'up'); }}
                className="p-1 rounded hover:bg-gray-200 text-gray-650"
                title="Move Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleReorder(node, 'down'); }}
                className="p-1 rounded hover:bg-gray-200 text-gray-650"
                title="Move Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              {node.type !== 'separator' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleToggleVisibility(node); }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-650"
                  title={node.hidden ? "Show" : "Hide"}
                >
                  {node.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteItem(node); }}
                className="p-1 rounded hover:bg-gray-200 text-red-600 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {node.type === 'submenu' && node.items && renderTreeNodes(node.items, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="p-6 flex flex-col h-full bg-gray-50 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>
      
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="startmenu">Start Menu</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance" className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Wallpaper</Label>
              <p className="text-sm text-gray-500">Choose a background image from the VFS.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectWallpaper}>
              Browse...
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Dark Mode</Label>
              <p className="text-sm text-gray-500">Enable dark theme across the system.</p>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Transparency Effects</Label>
              <p className="text-sm text-gray-500">Make taskbar and windows slightly transparent.</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Accent Color</Label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                <button 
                  key={color} 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm" 
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="startmenu" className="space-y-0">
          <div className="flex gap-4" style={{ height: '420px' }}>
            {/* Left: Tree panel */}
            <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden" style={{ width: '55%' }}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <span className="text-sm font-semibold text-gray-700">Start Menu Items</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAddNewItem('item')}
                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                    title="Add App"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAddNewItem('submenu')}
                    className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 transition-colors"
                    title="Add Submenu"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAddNewItem('separator')}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                    title="Add Separator"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {startMenuTree.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center p-4">Loading start menu...</p>
                ) : (
                  renderTreeNodes(startMenuTree)
                )}
              </div>
            </div>

            {/* Right: Detail panel */}
            <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1">
              {!selectedItem ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <HelpCircle className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Select an item to edit</p>
                </div>
              ) : selectedItem.type === 'separator' ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <div className="h-[2px] bg-gray-300 w-24 rounded" />
                  <p className="text-sm font-medium text-gray-500">Separator</p>
                  <p className="text-xs text-gray-400">No properties to edit</p>
                  <button
                    onClick={() => handleDeleteItem(selectedItem)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Separator
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                    <span className="text-sm font-semibold text-gray-700 truncate">
                      {selectedItem.label || selectedItem.id}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                      selectedItem.type === 'submenu' ? 'bg-yellow-100 text-yellow-700' :
                      selectedItem.type === 'action' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedItem.type}
                    </span>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-3 space-y-3">
                    {/* Label */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                      />
                    </div>

                    {/* Icon */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Icon (emoji or URL)</label>
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        placeholder="e.g. 📄 or https://..."
                      />
                    </div>

                    {/* Item-specific fields */}
                    {selectedItem.type === 'item' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Component</label>
                          <input
                            type="text"
                            value={editComponent}
                            onChange={(e) => setEditComponent(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                            placeholder="e.g. WebApp, FileExplorer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Launch Args (JSON)</label>
                          <textarea
                            value={editLaunchArgs}
                            onChange={(e) => setEditLaunchArgs(e.target.value)}
                            rows={3}
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none"
                            placeholder='{}'
                          />
                        </div>
                      </>
                    )}

                    {selectedItem.type === 'action' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Action ID</label>
                        <input
                          type="text"
                          value={editActionId}
                          onChange={(e) => setEditActionId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                          placeholder="e.g. shutdown"
                        />
                      </div>
                    )}

                    {/* Move to folder */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Move to Folder</label>
                      <div className="flex gap-2">
                        <select
                          value={moveTargetPath}
                          onChange={(e) => setMoveTargetPath(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        >
                          {submenuList.map((s) => (
                            <option key={s.path} value={s.path}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleMoveItemFolder(selectedItem, moveTargetPath)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap flex items-center gap-1"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          Move
                        </button>
                      </div>
                    </div>

                    {/* Visibility toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">Hidden</span>
                      <button
                        onClick={() => handleToggleVisibility(selectedItem)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedItem.hidden
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {selectedItem.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {selectedItem.hidden ? 'Hidden' : 'Visible'}
                      </button>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 bg-gray-50 shrink-0 gap-2">
                    <button
                      onClick={() => handleDeleteItem(selectedItem)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-5">
          {/* Registry Management */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold mb-1">Registry</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export, import, or reset the system registry (settings, preferences, and app configurations).
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={Download}
                label="Export Registry"
                loading={loading === "exportReg"}
                onClick={handleExportRegistry}
              />
              <ActionButton
                icon={Upload}
                label="Import Registry"
                loading={loading === "importReg"}
                onClick={handleImportRegistry}
              />
              <ActionButton
                icon={RotateCcw}
                label="Reset Registry"
                variant="destructive"
                onClick={handleResetRegistry}
              />
            </div>
          </div>

          {/* Internal Storage Management */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold mb-1">Internal Storage</h3>
              Export, import, or reset files on the root filesystem. The registry file is excluded from these operations.
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={Download}
                label="Export Storage"
                loading={loading === "exportStorage"}
                onClick={handleExportStorage}
              />
              <ActionButton
                icon={Upload}
                label="Import Storage"
                loading={loading === "importStorage"}
                onClick={handleImportStorage}
              />
              <ActionButton
                icon={RotateCcw}
                label="Reset Storage"
                variant="destructive"
                onClick={handleResetStorage}
              />
            </div>
          </div>

          {/* Reset Everything */}
          <div className="p-4 bg-white rounded-lg border border-red-200 shadow-sm">
            <h3 className="text-base font-semibold mb-1 text-red-700">Factory Reset</h3>
            <p className="text-sm text-gray-500 mb-4">
              Permanently erase all data — registry, files, and storage. This action cannot be undone.
            </p>
            <ActionButton
              icon={Trash2}
              label="Reset Everything"
              variant="destructive"
              onClick={handleResetEverything}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4 text-blue-600 font-bold italic">AmerOS</div>
            <p className="text-gray-600 font-medium">Version 1.0.0 (Build 2026.03)</p>
            <p className="text-sm text-gray-400 mt-2">© 2026 AmerH. All rights reserved.</p>
            <div className="mt-6 pt-6 border-t border-gray-100 italic text-sm text-gray-500">
              "Bringing gravity to the antigravity experiment."
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
