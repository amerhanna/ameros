import React, { useState } from 'react';
import { useSystemDialogs } from '@/hooks/useSystemDialogs';
import { vfs } from '@/lib/vfs';

interface SelectedFragment {
  id: string;
  nodeId: string;
  fragmentIndex: number;
  type: string;
  content: string;
  preview: string;
}

// Fragment Item Component for collapsible THINK blocks
const FragmentItem = ({ frag, nodeId, fragmentIndex, isSelected, onToggleSelect }: { 
  frag: any; 
  nodeId: string;
  fragmentIndex: number;
  isSelected: boolean;
  onToggleSelect: (selected: boolean) => void;
}) => {
  const isThink = frag.type === 'THINK';
  const [isOpen, setIsOpen] = useState(!isThink);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(frag.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelect(e.target.checked);
  };

  return (
    <div className="mb-2 last:mb-0 overflow-hidden">
      <div
        className={`inline-flex items-center gap-2 ${isThink ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={() => isThink && setIsOpen(!isOpen)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="cursor-pointer"
          title="Select to export"
        />
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase text-white flex items-center gap-1 ${
            frag.type === 'THINK' ? 'bg-purple-500' : frag.type === 'REQUEST' ? 'bg-blue-500' : 'bg-green-600'
          }`}
        >
          {isThink && <span className="font-mono font-bold w-3 text-center">{isOpen ? '−' : '+'}</span>}
          {frag.type}
        </span>
      </div>
      {isOpen && (
        <div className="relative mt-1 group">
          <button
            onClick={handleCopy}
            title="Copy"
            className="absolute top-2 right-2 px-2 py-1 text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 z-10 shadow-sm"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-white border border-gray-200 p-3 pr-14 rounded text-sm overflow-x-auto">
            {frag.content}
          </pre>
        </div>
      )}
    </div>
  );
};

// Recursive Node Component
const TreeNode = ({ nodeId, mapping, selectedFragments, onToggleFragment }: { 
  nodeId: string; 
  mapping: any;
  selectedFragments: Set<string>;
  onToggleFragment: (id: string, nodeId: string, index: number, type: string, content: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const node = mapping[nodeId];

  if (!node) return null;

  const hasChildren = node.children && node.children.length > 0;
  const hasMessage = node.message && node.message.fragments;

  const totalDescendants = React.useMemo(() => {
    if (!hasChildren) return 0;
    const countDescendants = (id: string, map: any, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      const n = map[id];
      if (!n || !n.children || n.children.length === 0) return 0;
      let count = n.children.length;
      for (const childId of n.children) {
        count += countDescendants(childId, map, visited);
      }
      return count;
    };
    return countDescendants(nodeId, mapping);
  }, [nodeId, mapping, hasChildren]);

  // Extract a preview for the summary line
  const getPreview = () => {
    if (!hasMessage) return `Node: ${nodeId}`;
    const nonThink = node.message.fragments.find((f: any) => f.type !== 'THINK' && f.content);
    if (nonThink) return nonThink.content;
    return node.message.fragments.find((f: any) => f.content)?.content || '';
  };

  return (
    <div className="border-l border-gray-200 ps-4 pt-4 pb-4 w-full overflow-hidden">
      <div
        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors w-full overflow-hidden pe-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-mono font-bold mr-2 w-4 flex-shrink-0">{isOpen ? '−' : '+'}</span>
        <span className="font-semibold text-sm truncate flex-1">{getPreview()}</span>
        {hasChildren && (
          <span className="ml-2 text-xs text-gray-400 font-medium whitespace-nowrap flex-shrink-0">
            ({totalDescendants} {totalDescendants === 1 ? 'node' : 'nodes'}, {node.children.length} {node.children.length === 1 ? 'child' : 'children'})
          </span>
        )}
      </div>

      {isOpen && (
        <div className="mt-2">
          {/* Render Message Fragments */}
          {hasMessage && (
            <div className="bg-gray-50 ps-3 pt-3 pb-3 rounded border border-gray-100 text-sm">
              {node.message.fragments.map((frag: any, idx: number) => {
                const fragmentId = `${nodeId}-${idx}`;
                return (
                  <FragmentItem 
                    key={idx} 
                    frag={frag}
                    nodeId={nodeId}
                    fragmentIndex={idx}
                    isSelected={selectedFragments.has(fragmentId)}
                    onToggleSelect={(selected) => {
                      onToggleFragment(fragmentId, nodeId, idx, frag.type, frag.content);
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Render Children Recursively */}
          {hasChildren && (
            <div className="flex flex-col gap-2 border">
              {node.children.map((childId: string) => (
                <TreeNode 
                  key={childId} 
                  nodeId={childId} 
                  mapping={mapping}
                  selectedFragments={selectedFragments}
                  onToggleFragment={onToggleFragment}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Selection Panel Component
const SelectionPanel = ({ selectedFragments, onRemove, onExport }: {
  selectedFragments: SelectedFragment[];
  onRemove: (id: string) => void;
  onExport: () => void;
}) => {
  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-800">Selection ({selectedFragments.length})</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {selectedFragments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No fragments selected</p>
        ) : (
          selectedFragments.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded p-2 text-xs">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={`inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-bold flex-shrink-0 ${
                  item.type === 'THINK' ? 'bg-purple-500' : item.type === 'REQUEST' ? 'bg-blue-500' : 'bg-green-600'
                }`}>
                  {item.type}
                </span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-gray-400 hover:text-red-500 font-bold text-lg h-5 w-5 flex items-center justify-center"
                  title="Remove"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 line-clamp-3">{item.preview}</p>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <button
          onClick={onExport}
          disabled={selectedFragments.length === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Export to TXT
        </button>
      </div>
    </div>
  );
};

// Main History Container
const DeepSeekHistory = () => {
  const [historyData, setHistoryData] = useState<any[] | null>(null);
  const [selectedFragments, setSelectedFragments] = useState<Map<string, SelectedFragment>>(new Map());
  const { showSaveFileDialog } = useSystemDialogs();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setHistoryData(Array.isArray(json) ? json : [json]);
        setSelectedFragments(new Map());
      } catch (err: any) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleFragment = (id: string, nodeId: string, fragmentIndex: number, type: string, content: string) => {
    setSelectedFragments((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        next.set(id, {
          id,
          nodeId,
          fragmentIndex,
          type,
          content,
          preview,
        });
      }
      return next;
    });
  };

  const handleRemoveFragment = (id: string) => {
    setSelectedFragments((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleExport = async () => {
    const path = await showSaveFileDialog({ defaultFileName: 'export.txt' });
    if (!path) return;

    // Format selected fragments for export
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('EXPORTED FRAGMENTS FROM DEEPSEEK HISTORY');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Export Date: ${new Date().toISOString()}`);
    lines.push(`Total Fragments: ${selectedFragments.size}`);
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');

    selectedFragments.forEach((fragment, index) => {
      lines.push(`[${index + 1}] TYPE: ${fragment.type}`);
      lines.push('-'.repeat(80));
      lines.push(fragment.content);
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('');
    });

    const content = lines.join('\n');

    // Write to VFS
    try {
      await vfs.writeFile(path, content);
      alert(`Successfully exported ${selectedFragments.size} fragments to ${path}`);
    } catch (error) {
      alert(`Failed to export: ${error}`);
    }
  };

  const selectedArray = Array.from(selectedFragments.values());

  return (
    <div className="w-full h-full flex bg-white overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1">
          <div className="p-6">
            <header className="mb-8 border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-800">History Explorer</h1>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </header>

            {!historyData ? (
              <div className="text-center py-20 text-gray-400">Upload your history.json to begin.</div>
            ) : (
              historyData.map((convo) => (
                <div key={convo.id} className="mb-6 border border-gray-200 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-blue-800 mb-2 border-b pb-2">{convo.title || 'Untitled Conversation'}</h2>
                  {/* Start recursion from the mapping's root node */}
                  {convo.mapping?.root?.children?.map((childId: string) => (
                    <TreeNode 
                      key={childId} 
                      nodeId={childId} 
                      mapping={convo.mapping}
                      selectedFragments={new Set(selectedFragments.keys())}
                      onToggleFragment={handleToggleFragment}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selection panel */}
      <SelectionPanel 
        selectedFragments={selectedArray}
        onRemove={handleRemoveFragment}
        onExport={handleExport}
      />
    </div>
  );
};

export default DeepSeekHistory;
