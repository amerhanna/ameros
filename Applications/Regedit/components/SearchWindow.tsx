"use client";

import { useState, useMemo } from "react";
import { RegistryValue } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { ItemView } from "@/components/ItemView";
import { useWindowActions } from "@/hooks/useWindowActions";
import { FileText } from "lucide-react";
import { getParentKeyPath } from "../Regedit";

const SearchWindow = ({ entries, onOpen }: { entries: Record<string, RegistryValue>; onOpen: (item: any) => void }) => {
  const [query, setQuery] = useState("");
  const { close } = useWindowActions();

  const searchResults = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return Object.entries(entries)
      .filter(([fullPath]) => fullPath.toLowerCase().includes(lowerQuery))
      .map(([fullPath]) => ({
        fullPath,
        label: fullPath,
        value: entries[fullPath],
        parentPath: getParentKeyPath(fullPath),
      }))
      .slice(0, 100);
  }, [query, entries]);

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