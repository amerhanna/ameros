'use client';

import { type MouseEvent, type ReactNode, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface TreeNode {
  path: string;
  name: string;
  type: string | 'drive' | 'dir' | 'file';
  status?: 'granted' | 'denied' | 'prompt';
}

export interface TreeViewProps<TItem> {
  items: TItem[];
  loading?: boolean;
  error?: string | null;
  defaultExpanded?: string[];
  selectedKey?: string | null;
  getKey: (item: TItem) => string;
  getLabel: (item: TItem) => string;
  getIcon: (item: TItem) => ReactNode;
  getChildren?: (item: TItem) => TItem[] | undefined;
  getStatusIcon?: (item: TItem) => ReactNode | null;
  onSelect?: (item: TItem) => void;
  onOpen?: (item: TItem) => void;
  onContextMenu?: (e: MouseEvent<HTMLDivElement>, item: TItem | null) => void;
  onRetry?: () => void;
}

export function TreeView<TItem extends TreeNode>({
  items,
  loading,
  error,
  defaultExpanded = [],
  selectedKey,
  getKey,
  getLabel,
  getIcon,
  getChildren,
  getStatusIcon,
  onSelect,
  onOpen,
  onContextMenu,
  onRetry,
}: TreeViewProps<TItem>) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(defaultExpanded));

  // Compare the actual string values to prevent the array-reference re-render trap.
  // Merge new default keys instead of nuking the user's manual expansion state.
  useEffect(() => {
    if (defaultExpanded.length === 0) return;

    setExpandedKeys((prev) => {
      const next = new Set(prev);
      let changed = false;
      defaultExpanded.forEach((key) => {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded.join(',')]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderNode = (item: TItem, depth = 0) => {
    const key = getKey(item);
    const label = getLabel(item);
    const icon = getIcon(item);
    const statusIcon = getStatusIcon?.(item);
    const children = getChildren?.(item) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedKeys.has(key);
    const isSelected = selectedKey ? selectedKey === key : false;

    return (
      <div key={key}>
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer select-none transition-colors ${
            isSelected ? 'bg-[#cce8ff] text-slate-900' : 'text-slate-700 hover:bg-[#e5f3ff]'
          }`}
          style={{ paddingLeft: 10 + depth * 16 }}
          onClick={() => onSelect?.(item)}
          onDoubleClick={() => onOpen?.(item)}
          onContextMenu={(e) => {
            e.stopPropagation();
            onContextMenu?.(e, item);
          }}
        >
          <button
            type="button"
            className="flex items-center justify-center w-4 h-4 p-0 text-slate-500 hover:text-slate-800"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleExpand(key);
              }
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <span className="inline-block w-4 h-4" />
            )}
          </button>
          <div className="relative w-5 h-5 flex items-center justify-center">
            {icon}
            {statusIcon && (
              <div className="absolute -right-1 -bottom-1 rounded-full bg-white p-0.5 border border-slate-200 shadow-sm">{statusIcon}</div>
            )}
          </div>
          <span className="truncate">{label}</span>
        </div>

        {hasChildren && isExpanded && <div>{children.map((child) => renderNode(child, depth + 1))}</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
        <div className="w-8 h-8 mr-2 rounded-full bg-slate-300" />
        Loading tree...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-3xl mb-3">ℹ️</div>
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

  return (
    <div className="h-full overflow-auto bg-white" onContextMenu={(e) => onContextMenu?.(e, null)}>
      {items.length === 0 ? (
        <div className="p-4 text-xs text-slate-500">No items to show.</div>
      ) : (
        <div>{items.map((item) => renderNode(item))}</div>
      )}
    </div>
  );
}
