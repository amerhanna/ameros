"use client";

import { useState, useMemo } from "react";
import { RegistryNode, RegistryValue } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { ItemView } from "@/components/ItemView";
import { useWindowActions } from "@/hooks/useWindowActions";
import { FileText } from "lucide-react";
import { getParentKeyPath } from "../Regedit";

interface SearchResult {
  fullPath: string;
  label: string;
  value?: RegistryValue;
  parentPath: string;
  isKey?: boolean;
}

const SearchWindow = ({
  entries,
  rawHive,
  onOpen,
}: {
  entries: Record<string, RegistryValue>;
  rawHive: RegistryNode[];
  onOpen: (item: SearchResult) => void;
}) => {
  const [query, setQuery] = useState("");
  const { close } = useWindowActions();

  const searchResults = useMemo(() => {
    const lowerQuery = query.toLowerCase();

    const collectKeys = (nodes: RegistryNode[], parentPath = ""): SearchResult[] => {
      const results: SearchResult[] = [];
      for (const node of nodes) {
        if (node.type !== "key") continue;
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        results.push({
          fullPath: currentPath,
          label: currentPath,
          parentPath: currentPath,
          isKey: true,
        });
        results.push(...collectKeys(node.content, currentPath));
      }
      return results;
    };

    const keyResults = collectKeys(rawHive).filter((result) => result.fullPath.toLowerCase().includes(lowerQuery));
    const valueResults = Object.entries(entries)
      .filter(([fullPath]) => fullPath.toLowerCase().includes(lowerQuery))
      .map(([fullPath]) => ({
        fullPath,
        label: fullPath,
        value: entries[fullPath],
        parentPath: getParentKeyPath(fullPath),
      }));

    const resultMap = new Map<string, SearchResult>();
    for (const result of valueResults) {
      resultMap.set(result.fullPath, result);
    }
    for (const result of keyResults) {
      if (!resultMap.has(result.fullPath)) {
        resultMap.set(result.fullPath, result);
      }
    }

    return Array.from(resultMap.values()).slice(0, 100);
  }, [query, entries, rawHive]);

  return (
    <div className="h-full bg-[#f5f5f5] p-4 flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Find what:</label>
        <input
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Search registry paths..."
        />
      </div>

      <div className="flex-1 overflow-auto border border-slate-300 rounded bg-white p-2">
        {searchResults.length === 0 ? (
          <div className="text-sm text-slate-500 py-10 text-center">
            {query.trim() ? "No matching registry entries found." : "Type a path or key name to search."}
          </div>
        ) : (
          <ItemView
            items={searchResults}
            viewStyle="list"
            selectedKey={null}
            itemKey={(item) => item.fullPath}
            itemLabel={(item) => item.label}
            getIcon={() => <FileText className="w-4 h-4" />}
            onOpen={(item) => {
              onOpen(item);
              close();
            }}
            onSelect={() => undefined}
            onContextMenu={() => {}}
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={close}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default SearchWindow