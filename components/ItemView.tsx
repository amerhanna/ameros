"use client";

import { type ReactNode, useEffect, useState } from "react";
import { type ClipboardState } from "@/lib/clipboard";

export interface ItemViewProps<TItem> {
  items: TItem[];
  loading?: boolean;
  error?: string | null;
  clipboard?: ClipboardState | null;
  viewStyle?: "grid" | "list" | "details";
  columnNames?: string[];
  detailsMapper?: (item: TItem) => ReactNode[];
  selectedKey?: string | null;
  itemKey: (item: TItem) => string;
  itemLabel: (item: TItem) => string;
  getIcon: (item: TItem) => ReactNode;
  getStatusIcon?: (item: TItem) => ReactNode | null;
  onOpen: (item: TItem) => void;
  onSelect?: (item: TItem) => void;
  onContextMenu: (e: React.MouseEvent, item: TItem | null) => void;
  onRetry?: () => void;
}

export function ItemView<TItem>({
  items,
  loading,
  error,
  clipboard,
  viewStyle = "grid",
  columnNames = ["Name"],
  detailsMapper,
  selectedKey,
  itemKey,
  itemLabel,
  getIcon,
  getStatusIcon,
  onOpen,
  onSelect,
  onContextMenu,
  onRetry,
}: ItemViewProps<TItem>) {
  const [selectedItem, setSelectedItem] = useState<TItem | undefined>(items.find((item) => itemKey(item) === selectedKey));

  useEffect(() => {
    setSelectedItem(items.find((item) => itemKey(item) === selectedKey));
  }, [items, selectedKey, itemKey]);

  const handleSelect = (item: TItem) => {
    setSelectedItem(item);
    onSelect?.(item);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
        <div className="w-8 h-8 mr-2 rounded-full bg-slate-300" />
        Loading items...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-12 h-12 text-blue-500 mb-4 text-5xl">ℹ️</div>
        <div className="text-sm font-bold text-slate-800 mb-2">Access Issue Detected</div>
        <div className="text-xs text-slate-500 max-w-xs">{error}</div>
        {onRetry && (
          <button
            type="button"
            className="mt-4 rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // --- Details View Implementation ---
  if (viewStyle === "details") {
    return (
      <div className="h-full overflow-auto bg-white select-none" onContextMenu={(e) => onContextMenu(e, null)}>
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-slate-200">
              {columnNames.map((col, i) => (
                <th
                  key={col}
                  className={`text-[12px] font-normal text-slate-600 px-2 py-1 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 cursor-default ${
                    i === 0 ? "w-[40%]" : ""
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const key = itemKey(item);
              const label = itemLabel(item);
              const icon = getIcon(item);
              const isSelected = selectedItem ? itemKey(selectedItem) === key : false;
              const isCut = clipboard?.item === key && clipboard.action === "cut";
              const extraCols = detailsMapper?.(item) || [];

              return (
                <tr
                  key={key}
                  className={`group cursor-pointer text-[12px] ${isCut ? "opacity-40" : ""} ${
                    isSelected ? "bg-[#cce8ff]" : "hover:bg-[#e5f3ff]"
                  }`}
                  onClick={() => handleSelect(item)}
                  onDoubleClick={() => onOpen(item)}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    onContextMenu(e, item);
                  }}
                >
                  <td className="px-2 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
                    <div className="w-4 h-4 shrink-0 flex items-center justify-center scale-75">{icon}</div>
                    <span className="truncate">{label}</span>
                  </td>
                  {extraCols.map((content, idx) => (
                    <td key={idx} className="px-2 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis text-slate-500">
                      {content}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-10 text-slate-400 text-sm italic">This folder is empty.</div>}
      </div>
    );
  }

  // --- Grid and List Views ---
  return (
    <div className="h-full overflow-auto bg-white" onContextMenu={(e) => onContextMenu(e, null)}>
      <div
        className={`p-2 content-start ${
          viewStyle === "list" ? "grid grid-cols-1 gap-0.5" : "grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))]"
        }`}
      >
        {items.map((item) => {
          const key = itemKey(item);
          const label = itemLabel(item);
          const icon = getIcon(item);
          const statusIcon = getStatusIcon?.(item);
          const isCut = clipboard?.item === key && clipboard.action === "cut";
          const isSelected = selectedItem ? itemKey(selectedItem) === key : false;

          return (
            <div
              key={key}
              className={`flex gap-2 p-1 rounded border border-transparent cursor-pointer transition-opacity ${
                viewStyle === "list" ? "items-center text-left" : "flex-col items-center text-center"
              } ${isCut ? "opacity-40" : ""} ${isSelected ? "bg-[#cce8ff] border-[#99d1ff]" : "hover:bg-[#e5f3ff] hover:border-[#cde8ff]"}`}
              onClick={() => handleSelect(item)}
              onDoubleClick={() => onOpen(item)}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, item);
              }}
            >
              <div
                className={
                  viewStyle === "list"
                    ? "w-4 h-4 flex items-center justify-center shrink-0"
                    : "relative w-10 h-10 flex items-center justify-center"
                }
              >
                {icon}
                {statusIcon && viewStyle !== "list" && (
                  <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm border border-slate-100 bg-white">
                    {statusIcon}
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] leading-tight text-slate-700 ${viewStyle === "list" ? "truncate" : "break-all line-clamp-2 px-1"}`}
              >
                {label}
              </span>
            </div>
          );
        })}

        {items.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 text-sm italic">This folder is empty.</div>}
      </div>
    </div>
  );
}
