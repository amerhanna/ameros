"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { registry, RegistryValue } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { TreeView, type TreeNode } from "@/components/TreeView";
import { ItemView } from "@/components/ItemView";
import ResizablePanels from "@/components/layout/ResizablePanels";
import { useWindowActions } from "@/hooks/useWindowActions";
import { toast } from "sonner";
import { Folder, RefreshCw, FileText } from "lucide-react";
import RegistryValueEditorWindow from "./components/RegistryValueEditorWindow";
import SearchWindow from "./components/SearchWindow";

const ROOT_HIVE_KEYS = ["HKEY_CLASSES_ROOT", "HKEY_CURRENT_USER", "HKEY_LOCAL_MACHINE", "HKEY_USERS", "HKEY_CURRENT_CONFIG"];

interface RegistryTreeNode extends TreeNode {
  children?: RegistryTreeNode[];
}

interface RegistryValueItem {
  fullPath: string;
  parentPath: string;
  valueName: string;
  value: RegistryValue;
}

export const getParentKeyPath = (fullPath: string) => {
  const idx = fullPath.lastIndexOf("/");
  return idx === -1 ? fullPath : fullPath.slice(0, idx);
};

const getValueName = (fullPath: string) => {
  const idx = fullPath.lastIndexOf("/");
  // If the path doesn't contain a slash but isn't a root hive, it might be a top-level value,
  // but in this logic, we treat terminal segments as value names.
  return idx === -1 ? "(Default)" : fullPath.slice(idx + 1);
};

const formatRegistryType = (value: RegistryValue) => {
  if (value === null) return "REG_SZ";
  if (Array.isArray(value)) return "REG_MULTI_SZ";
  if (typeof value === "object") return "REG_BINARY";
  if (typeof value === "boolean" || typeof value === "number") return "REG_DWORD";
  return "REG_SZ";
};

const formatRegistryValue = (value: RegistryValue) => {
  if (value === null) return "(value not set)";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

const getRegistryValueType = (value: RegistryValue) => {
  if (typeof value === "boolean") return "boolean" as const;
  if (typeof value === "number") return "number" as const;
  if (value === null) return "string" as const;
  if (typeof value === "object") return "object" as const;
  return "string" as const;
};

export default function Regedit() {
  const { openChildWindow, setMenuBar } = useWindowActions();
  const [entries, setEntries] = useState<Record<string, RegistryValue>>({});
  const [selectedKey, setSelectedKey] = useState(ROOT_HIVE_KEYS[0]);
  const [selectedValuePath, setSelectedValuePath] = useState<string | null>(null);

  const loadRegistry = useCallback(async () => {
    try {
      const allEntries = await registry.getAll();
      setEntries(allEntries);
    } catch (error) {
      toast.error("Failed to load registry.");
    }
  }, []);

  useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  useEffect(() => {
    const handleUpdate = () => loadRegistry();
    window.addEventListener("reg-update", handleUpdate);
    return () => window.removeEventListener("reg-update", handleUpdate);
  }, [loadRegistry]);

  const treeItems = useMemo<RegistryTreeNode[]>(() => {
    const nodes = new Map<string, RegistryTreeNode>();
    const roots: RegistryTreeNode[] = [];

    const addChild = (parent: RegistryTreeNode, child: RegistryTreeNode) => {
      parent.children = parent.children ?? [];
      if (!parent.children.some((node) => node.path === child.path)) {
        parent.children.push(child);
      }
    };

    const ensureNode = (path: string) => {
      if (nodes.has(path)) return nodes.get(path)!;

      const name = path.split("/").pop() ?? path;
      const node: RegistryTreeNode = { path, name, type: "dir", children: [] };
      nodes.set(path, node);

      if (path.includes("/") && !ROOT_HIVE_KEYS.includes(path)) {
        const parentPath = path.slice(0, path.lastIndexOf("/"));
        const parent = ensureNode(parentPath);
        addChild(parent, node);
      } else {
        roots.push(node);
      }
      return node;
    };

    ROOT_HIVE_KEYS.forEach((rootKey) => ensureNode(rootKey));
    Object.keys(entries).forEach((entryPath) => {
      const keyPath = getParentKeyPath(entryPath);
      ensureNode(keyPath);
    });

    const sortNodes = (list: RegistryTreeNode[]) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      list.forEach((node) => {
        if (node.children) sortNodes(node.children);
      });
    };

    sortNodes(roots);
    return roots;
  }, [entries]);

  const valueItems = useMemo<RegistryValueItem[]>(() => {
    const items = Object.entries(entries)
      .map(([fullPath, value]) => ({
        fullPath,
        parentPath: getParentKeyPath(fullPath),
        valueName: getValueName(fullPath),
        value,
      }))
      .filter((item) => item.parentPath === selectedKey);

    // Ensure (Default) value exists for the selected key
    const hasDefault = items.some((item) => item.valueName === "(Default)");
    if (!hasDefault) {
      items.push({
        fullPath: `${selectedKey}/(Default)`,
        parentPath: selectedKey,
        valueName: "(Default)",
        value: null,
      });
    }

    return items.sort((a, b) => {
      if (a.valueName === "(Default)") return -1;
      if (b.valueName === "(Default)") return 1;
      return a.valueName.localeCompare(b.valueName);
    });
  }, [entries, selectedKey]);

  const handleNewKey = useCallback(() => {
    openChildWindow({
      title: "New Registry Key",
      component: RegistryValueEditorWindow,
      launchArgs: {
        mode: "newKey",
        selectedKey,
      },
      width: 440,
      height: 335,
      modal: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
    });
  }, [openChildWindow, selectedKey]);

  const handleNewValue = useCallback(() => {
    openChildWindow({
      title: "New Registry Value",
      component: RegistryValueEditorWindow,
      launchArgs: {
        mode: "newValue",
        selectedKey,
      },
      width: 440,
      height: 335,
      modal: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
    });
  }, [openChildWindow, selectedKey]);

  const handleEditValue = useCallback((item: RegistryValueItem) => {
    openChildWindow({
      title: `Edit Value: ${item.valueName}`,
      component: RegistryValueEditorWindow,
      launchArgs: {
        mode: "editValue",
        selectedKey: item.parentPath,
        valueName: item.valueName,
        value: item.value,
      },
      width: 440,
      height: 335,
      modal: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
    });
  }, [openChildWindow]);


  const handleOpenSearch = useCallback(() => {
    openChildWindow({
      title: "Find",
      component: SearchWindow,
      launchArgs: {
        entries,
        onOpen: (item: RegistryValueItem) => {
          setSelectedKey(item.parentPath);
          setSelectedValuePath(item.fullPath);
        },
      },
      width: 420,
      height: 320,
      modal: false,
      resizable: false,
    });
  }, [entries, openChildWindow]);

  useEffect(() => {
    setMenuBar([
      {
        type: "submenu",
        label: "File",
        items: [
          { type: "item", label: "New Key", action: handleNewKey },
          { type: "item", label: "New Value", action: handleNewValue },
          { type: "separator" },
          { type: "item", label: "Refresh", action: loadRegistry, shortcut: "F5" },
        ],
      },
      {
        type: "submenu",
        label: "Edit",
        items: [{ type: "item", label: "Find...", action: handleOpenSearch, shortcut: "Ctrl+F" }],
      },
      {
        type: "submenu",
        label: "Help",
        items: [{ type: "item", label: "About Registry Editor", action: () => toast("AmerOS Registry Editor") }],
      },
    ]);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#d4d0c8] text-slate-900 select-none border border-[#808080]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#808080] bg-[#ebebe7]">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 flex-1 min-w-0">
          <div className="text-xs text-slate-500 whitespace-nowrap">Selected key:</div>
          <div className="truncate font-mono bg-white px-1 border border-[#808080] flex-1">{selectedKey}</div>
        </div>
        <div className="border-l border-[#808080] h-5" />
        <Button variant="ghost" size="sm" onClick={loadRegistry} className="px-3 py-1">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
        <div className="ml-auto text-xs text-slate-500">AmerOS Registry Editor</div>
      </div>

      <div className="flex-1 overflow-hidden m-1 border border-[#808080] shadow-inner bg-white">
        <ResizablePanels direction="horizontal" initialSizes={[30, 70]} minSize={140} className="h-full">
          <div className="h-full border-r border-slate-200 bg-white overflow-auto">
            <TreeView
              items={treeItems}
              loading={false}
              error={null}
              selectedKey={selectedKey}
              getKey={(node) => node.path}
              getLabel={(node) => node.name}
              getIcon={() => <Folder className="w-4 h-4 text-yellow-600" />}
              getChildren={(node) => node.children}
              onSelect={(node) => setSelectedKey(node.path)}
              onOpen={(node) => setSelectedKey(node.path)}
              onContextMenu={() => {}}
            />
          </div>

          <div className="h-full overflow-hidden flex flex-col bg-white">
            <ItemView
              items={valueItems}
              viewStyle="details"
              columnNames={["Name", "Type", "Data"]}
              detailsMapper={(item) => [formatRegistryType(item.value), formatRegistryValue(item.value)]}
              selectedKey={selectedValuePath}
              itemKey={(item) => item.fullPath}
              itemLabel={(item) => item.valueName}
              getIcon={() => <FileText className="w-4 h-4 text-blue-600" />}
              onSelect={(item) => setSelectedValuePath(item.fullPath)}
              onOpen={(item) => {
                setSelectedValuePath(item.fullPath);
                handleEditValue(item);
              }}
              onContextMenu={() => {}}
            />
          </div>
        </ResizablePanels>
      </div>
    </div>
  );
}
